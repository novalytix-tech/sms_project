import uuid
from datetime import datetime, timezone, timedelta
from flask_jwt_extended import create_access_token, decode_token
from app.extensions import db
from app.models import User, Institution, PasswordReset, TokenBlocklist
from app.services.email_service import email_service
from app.utils.security import hash_password, hash_token, generate_secure_token


# -------------------------------------------------------------
# 1. Login & Credential Validation Tests
# -------------------------------------------------------------

def test_valid_login(client):
    """Test 1: Valid login returns HTTP 200, JWT access token, and user metadata."""
    res = client.post("/api/v1/auth/login", json={
        "email": "principal@stxaviers.edu.in",
        "password": "SchoolERP@Demo2026!"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["user"]["email"] == "principal@stxaviers.edu.in"
    assert "school_admin" in data["data"]["user"]["roles"]
    # Check that HttpOnly cookie was set
    cookie = res.headers.get("Set-Cookie")
    assert "refresh_token_cookie" in cookie
    assert "HttpOnly" in cookie


def test_invalid_password(client):
    """Test 2: Incorrect password returns HTTP 401 with generic error envelope."""
    res = client.post("/api/v1/auth/login", json={
        "email": "principal@stxaviers.edu.in",
        "password": "WrongPassword@999"
    })
    assert res.status_code == 401
    data = res.get_json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_CREDENTIALS"
    assert "Invalid email or password" in data["error"]["message"]


def test_unknown_email(client):
    """Test 3: Unregistered email returns generic error to prevent account enumeration."""
    res = client.post("/api/v1/auth/login", json={
        "email": "nonexistent.user@randomdomain.com",
        "password": "SchoolERP@Demo2026!"
    })
    assert res.status_code == 401
    data = res.get_json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_CREDENTIALS"
    assert "Invalid email or password" in data["error"]["message"]


def test_inactive_account(client, app):
    """Test 4: Inactive account cannot authenticate and returns HTTP 401."""
    with app.app_context():
        user = User.query.filter_by(email="orders@apexsupplies.in").first()
        user.is_active = False
        db.session.commit()

    res = client.post("/api/v1/auth/login", json={
        "email": "orders@apexsupplies.in",
        "password": "SchoolERP@Demo2026!"
    })
    assert res.status_code in (401, 403)
    data = res.get_json()
    assert data["error"]["code"] == "ACCOUNT_INACTIVE"

    # Restore user
    with app.app_context():
        user = User.query.filter_by(email="orders@apexsupplies.in").first()
        user.is_active = True
        db.session.commit()


def test_suspended_institution(client, app):
    """Test 5: User belonging to suspended institution cannot authenticate (HTTP 403)."""
    try:
        with app.app_context():
            inst = Institution.query.filter_by(code="STXAV-DELHI").first()
            inst.status = "SUSPENDED"
            db.session.commit()

        res = client.post("/api/v1/auth/login", json={
            "email": "principal@stxaviers.edu.in",
            "password": "SchoolERP@Demo2026!"
        })
        assert res.status_code == 403
        data = res.get_json()
        assert data["error"]["code"] == "INSTITUTION_SUSPENDED"
    finally:
        # Restore institution unconditionally
        with app.app_context():
            inst = Institution.query.filter_by(code="STXAV-DELHI").first()
            if inst:
                inst.status = "ACTIVE"
                db.session.commit()


# -------------------------------------------------------------
# 2. Token Lifecycle, Expiration & Rotation Tests
# -------------------------------------------------------------

def test_access_token_validation(client, auth_headers):
    """Test 6: Valid access token allows access to /me endpoint."""
    headers = auth_headers("principal@stxaviers.edu.in")
    res = client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["data"]["email"] == "principal@stxaviers.edu.in"
    assert data["data"]["institution"]["code"] == "STXAV-DELHI"


def test_expired_access_token(client, app):
    """Test 7: Expired access token is rejected with HTTP 401 TOKEN_EXPIRED."""
    with app.app_context():
        # Create expired token (expired 5 minutes ago)
        user = User.query.filter_by(email="principal@stxaviers.edu.in").first()
        expired_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(seconds=-300),
            additional_claims={"type": "access", "jti": str(uuid.uuid4())}
        )

    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code in (401, 403)
    data = res.get_json()
    assert data["error"]["code"] == "TOKEN_EXPIRED"


def test_refresh_token_rotation(client):
    """Test 8: Refresh token rotation issues new access token & new rotated refresh token."""
    # 1. Login to get initial cookies
    login_res = client.post("/api/v1/auth/login", json={
        "email": "ananya.sharma@stxaviers.edu.in",
        "password": "SchoolERP@Demo2026!"
    })
    assert login_res.status_code == 200

    # 2. Call /refresh with cookie
    refresh_res = client.post("/api/v1/auth/refresh")
    assert refresh_res.status_code == 200
    data = refresh_res.get_json()
    assert "access_token" in data["data"]

    # 3. Verify new refresh token cookie was set
    cookie = refresh_res.headers.get("Set-Cookie")
    assert "refresh_token_cookie" in cookie


def test_refresh_token_reuse_detection(client, app):
    """Test 9: Replay of an invalidated refresh token triggers reuse detection & revocation of all sessions."""
    # 1. Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": "sunita.verma@stxaviers.edu.in",
        "password": "SchoolERP@Demo2026!"
    })
    assert login_res.status_code == 200

    # Grab the initial refresh token from the cookie
    cookie_str = login_res.headers.get("Set-Cookie")
    initial_refresh_token = cookie_str.split("refresh_token_cookie=")[1].split(";")[0]

    # 2. First refresh (legitimate): consumes initial_refresh_token
    r1 = client.post("/api/v1/auth/refresh", json={"refresh_token": initial_refresh_token})
    assert r1.status_code == 200

    # 3. Second refresh using the consumed initial_refresh_token (REUSE ATTACK!)
    r2 = client.post("/api/v1/auth/refresh", json={"refresh_token": initial_refresh_token})
    assert r2.status_code == 401
    data = r2.get_json()
    assert data["error"]["code"] == "TOKEN_REUSE_DETECTED"

    # 4. Verify all active sessions for Sunita Verma were revoked
    with app.app_context():
        user = User.query.filter_by(email="sunita.verma@stxaviers.edu.in").first()
        revoked = TokenBlocklist.query.filter_by(user_id=user.id, token_type="all").first()
        assert revoked is not None


def test_logout(client, auth_headers):
    """Test 10: Logout adds token to blocklist and clears refresh cookie."""
    headers = auth_headers("principal@stxaviers.edu.in")
    res = client.post("/api/v1/auth/logout", headers=headers)
    assert res.status_code == 200

    # Verify that the access token is now rejected as revoked
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 401
    assert me_res.get_json()["error"]["code"] == "TOKEN_REVOKED"


def test_logout_all(client, auth_headers):
    """Test 11: Logout-all invalidates all active sessions for the user."""
    headers = auth_headers("aarav.patel@student.stxaviers.edu.in")
    res = client.post("/api/v1/auth/logout-all", headers=headers)
    assert res.status_code == 200

    # Subsequent access with previous token is rejected
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 401
    assert me_res.get_json()["error"]["code"] == "TOKEN_REVOKED"


# -------------------------------------------------------------
# 3. Password Reset & Forgot Password Tests
# -------------------------------------------------------------

def test_forgot_password_valid_email(client):
    """Test 12: Forgot password for registered email dispatches reset email."""
    email_service.outbox.clear()
    res = client.post("/api/v1/auth/forgot-password", json={
        "email": "vikram.patel@gmail.com"
    })
    assert res.status_code == 200
    assert "instructions to reset your password have been sent" in res.get_json()["message"]

    # Verify email was dispatched
    assert len(email_service.outbox) == 1
    assert email_service.outbox[0]["to"] == "vikram.patel@gmail.com"
    assert "Password Reset Request" in email_service.outbox[0]["subject"]


def test_forgot_password_unknown_email(client):
    """Test 13: Forgot password for unknown email returns same message but sends no email."""
    email_service.outbox.clear()
    res = client.post("/api/v1/auth/forgot-password", json={
        "email": "ghost.nonexistent@nowhere.com"
    })
    assert res.status_code == 200
    assert "instructions to reset your password have been sent" in res.get_json()["message"]
    # No email should be sent
    assert len(email_service.outbox) == 0


def test_valid_password_reset(client, app):
    """Test 14: Valid password reset completes and updates user credentials."""
    email_service.outbox.clear()
    # 1. Request reset
    client.post("/api/v1/auth/forgot-password", json={"email": "ananya.sharma@stxaviers.edu.in"})
    assert len(email_service.outbox) >= 1
    # Extract token from the email body
    email_text = email_service.outbox[-1]["text"]
    raw_token = email_text.split("token=")[1].split("\n")[0].strip()

    # 2. Reset password
    new_pass = "Ananya@NewPass2026!"
    try:
        reset_res = client.post("/api/v1/auth/reset-password", json={
            "token": raw_token,
            "new_password": new_pass,
            "confirm_password": new_pass
        })
        assert reset_res.status_code == 200

        # 3. Verify user can now log in with new password
        login_res = client.post("/api/v1/auth/login", json={
            "email": "ananya.sharma@stxaviers.edu.in",
            "password": new_pass
        })
        assert login_res.status_code == 200
    finally:
        # Restore password for future tests unconditionally
        with app.app_context():
            u = User.query.filter_by(email="ananya.sharma@stxaviers.edu.in").first()
            if u:
                u.password_hash = hash_password("SchoolERP@Demo2026!")
                db.session.commit()


def test_expired_reset_token(client, app):
    """Test 15: Expired reset token is rejected with HTTP 400."""
    raw_token = generate_secure_token(32)
    with app.app_context():
        user = User.query.filter_by(email="principal@stxaviers.edu.in").first()
        past_time = datetime.now(timezone.utc) - timedelta(minutes=10)
        reset = PasswordReset(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=past_time,
            is_used=False
        )
        db.session.add(reset)
        db.session.commit()

    res = client.post("/api/v1/auth/reset-password", json={
        "token": raw_token,
        "new_password": "NewSecret@2026!",
        "confirm_password": "NewSecret@2026!"
    })
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "RESET_TOKEN_EXPIRED"


def test_reused_reset_token(client, app):
    """Test 16: Already used reset token is rejected with HTTP 400."""
    raw_token = generate_secure_token(32)
    with app.app_context():
        user = User.query.filter_by(email="principal@stxaviers.edu.in").first()
        reset = PasswordReset(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
            is_used=True
        )
        db.session.add(reset)
        db.session.commit()

    res = client.post("/api/v1/auth/reset-password", json={
        "token": raw_token,
        "new_password": "NewSecret@2026!",
        "confirm_password": "NewSecret@2026!"
    })
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "RESET_TOKEN_USED"


def test_invalid_reset_token(client):
    """Test 17: Non-existent / random reset token is rejected."""
    res = client.post("/api/v1/auth/reset-password", json={
        "token": "completely_fake_invalid_token_12345",
        "new_password": "NewSecret@2026!",
        "confirm_password": "NewSecret@2026!"
    })
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "INVALID_RESET_TOKEN"


def test_change_password(client, auth_headers, app):
    """Test 18: Authenticated user can change password, but cannot reuse current password."""
    headers = auth_headers("vikram.patel@gmail.com")

    # 1. Attempt to change to same current password -> Rejected
    fail_res = client.post("/api/v1/auth/change-password", headers=headers, json={
        "current_password": "SchoolERP@Demo2026!",
        "new_password": "SchoolERP@Demo2026!",
        "confirm_password": "SchoolERP@Demo2026!"
    })
    assert fail_res.status_code == 400
    assert fail_res.get_json()["error"]["code"] == "PASSWORD_REUSE_FORBIDDEN"

    # 2. Change to valid new password
    new_pass = "Vikram@Patel2026#New"
    try:
        success_res = client.post("/api/v1/auth/change-password", headers=headers, json={
            "current_password": "SchoolERP@Demo2026!",
            "new_password": new_pass,
            "confirm_password": new_pass
        })
        assert success_res.status_code == 200

        # 3. Verify login works with new password
        login_res = client.post("/api/v1/auth/login", json={
            "email": "vikram.patel@gmail.com",
            "password": new_pass
        })
        assert login_res.status_code == 200
    finally:
        # Restore password unconditionally
        with app.app_context():
            u = User.query.filter_by(email="vikram.patel@gmail.com").first()
            if u:
                u.password_hash = hash_password("SchoolERP@Demo2026!")
                db.session.commit()

