import json
import pytest
from app import create_app


@pytest.fixture
def client(tmp_path):
    accounts_file = tmp_path / "dev_auth_accounts.json"
    data = {
        "institution": {
            "id": "ef673796-e678-5d31-9609-d7340362466f",
            "code": "DEV-LOCAL",
            "name": "St. Xavier Academy",
            "subdomain": "dev",
            "currency": "INR",
            "status": "ACTIVE"
        },
        "accounts": [
            {
                "id": "d53551f7-2055-58cc-8ef7-525c5f43273f",
                "email": "principal@stxaviers.edu.in",
                "username": "principal",
                "phone": "+91 98111 22331",
                "first_name": "Arvind",
                "last_name": "Swaminathan",
                "roles": ["school_admin"],
                "must_change_password": False,
                # Principal#2026!
                "password_hash": "$argon2id$v=19$m=65536,t=3,p=4$G6h3F4hsC4YYcXKDEUrAUg$WGixgUqQSt7B74/eyIbWvbAxYfjepSdGWraR7YuA1E8"
            },
            {
                "id": "331fa55f-516d-56c9-8d7e-f7884f686136",
                "email": "ananya.sharma@stxaviers.edu.in",
                "username": "ananya.sharma",
                "phone": "+91 97111 22334",
                "first_name": "Ananya",
                "last_name": "Sharma",
                "roles": ["teacher"],
                "must_change_password": False,
                # Teacher#Ananya26!
                "password_hash": "$argon2id$v=19$m=65536,t=3,p=4$c8ehdsJmxs4r6OJFspr5WQ$eyM0ABpoPztp4sPy48A9g9ybbDjwelkhaWMk8iPo+I4"
            }
        ]
    }
    accounts_file.write_text(json.dumps(data), encoding="utf-8")

    app = create_app("testing", {
        "DATABASE_ENABLED": False,
        "SQLALCHEMY_DATABASE_URI": None,
        "DEV_AUTH_ENABLED": True,
        "DEV_AUTH_ACCOUNTS_FILE": str(accounts_file),
    })
    with app.test_client() as c:
        yield c


def test_login_with_email(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "principal@stxaviers.edu.in",
        "password": "Principal#2026!"
    })
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["user"]["roles"] == ["school_admin"]
    assert "access_token" in data


def test_login_with_username_login_id(client):
    res = client.post("/api/v1/auth/login", json={
        "identifier": "principal",
        "password": "Principal#2026!"
    })
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["user"]["username"] == "principal"


def test_login_with_mobile_number(client):
    res = client.post("/api/v1/auth/login", json={
        "identifier": "9811122331",
        "password": "Principal#2026!"
    })
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["user"]["phone"] == "+91 98111 22331"


def test_otp_forgot_password_flow(client):
    # 1. Request OTP via registered mobile number
    req_res = client.post("/api/v1/auth/request-otp", json={
        "identifier": "9711122334",
        "channel": "sms"
    })
    assert req_res.status_code == 200
    otp_data = req_res.get_json()["data"]
    session_id = otp_data["session_id"]
    debug_otp = otp_data["debug_otp"]
    assert session_id
    assert debug_otp

    # 2. Verify with wrong OTP
    bad_res = client.post("/api/v1/auth/verify-otp", json={
        "session_id": session_id,
        "otp": "000000"
    })
    assert bad_res.status_code == 400

    # 3. Verify with correct OTP
    ok_res = client.post("/api/v1/auth/verify-otp", json={
        "session_id": session_id,
        "otp": debug_otp
    })
    assert ok_res.status_code == 200
    reset_token = ok_res.get_json()["data"]["reset_token"]
    assert reset_token

    # 4. Reset password using reset token
    new_pw = "NewTeacher#2026!"
    reset_res = client.post("/api/v1/auth/reset-password-otp", json={
        "reset_token": reset_token,
        "new_password": new_pw,
        "confirm_password": new_pw
    })
    assert reset_res.status_code == 200

    # 5. Verify login succeeds with the newly set password
    login_res = client.post("/api/v1/auth/login", json={
        "email": "ananya.sharma@stxaviers.edu.in",
        "password": new_pw
    })
    assert login_res.status_code == 200


def test_user_account_management_apis(client):
    # Login as admin to get token
    login_res = client.post("/api/v1/auth/login", json={
        "email": "principal@stxaviers.edu.in",
        "password": "Principal#2026!"
    })
    token = login_res.get_json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # List accounts
    list_res = client.get("/api/v1/users", headers=headers)
    assert list_res.status_code == 200
    accounts = list_res.get_json()["data"]
    assert len(accounts) >= 2

    # Create new student account
    create_res = client.post("/api/v1/users", json={
        "firstName": "Rohan",
        "lastName": "Verma",
        "email": "rohan.verma@student.stxaviers.edu.in",
        "phone": "+91 98111 23456",
        "role": "student"
    }, headers=headers)
    assert create_res.status_code == 201
    created_data = create_res.get_json()["data"]
    assert created_data["login_id"].startswith("STU-")
    assert created_data["temporary_password"]
    assert created_data["must_change_password"] is True

    # Resend credentials
    resend_res = client.post(f"/api/v1/users/{created_data['id']}/resend-credentials", json={
        "channel": "sms"
    }, headers=headers)
    assert resend_res.status_code == 200

    # Reset password
    reset_res = client.post(f"/api/v1/users/{created_data['id']}/reset-password", headers=headers)
    assert reset_res.status_code == 200
    assert reset_res.get_json()["data"]["temporary_password"]

