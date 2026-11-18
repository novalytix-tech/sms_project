import uuid
from typing import Optional
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    jwt_required, get_jwt, get_jwt_identity, decode_token
)
from app.extensions import limiter, db
from app.models import User, Student, StaffProfile, Parent
from app.services.auth_service import AuthService
from app.services.dev_auth_service import DevAuthService, is_dev_auth_active
from app.utils.errors import APIException, DatabaseUnavailableError

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


def _auth_service():
    """Database-backed AuthService, or DevAuthService while the database is disconnected."""
    return DevAuthService if is_dev_auth_active() else AuthService


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    """Authenticate credentials and issue JWT access and rotated refresh token cookie."""
    payload = request.get_json(silent=True) or {}
    email = payload.get("email") or payload.get("identifier") or payload.get("username") or payload.get("phone")
    password = payload.get("password")

    result = _auth_service().authenticate_user(
        email=email,
        password=password,
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string if request.user_agent else None,
    )

    refresh_token = result.pop("refresh_token")

    response = jsonify({
        "success": True,
        "data": result,
        "message": "Login successful."
    })

    # Set secure HttpOnly refresh token cookie
    secure_cookie = current_app.config.get("JWT_COOKIE_SECURE", False)
    response.set_cookie(
        key="refresh_token_cookie",
        value=refresh_token,
        httponly=True,
        secure=secure_cookie,
        samesite="Lax",
        path="/api/v1/auth",
        max_age=7 * 86400,  # 7 days
    )

    return response, 200


@auth_bp.route("/refresh", methods=["POST"])
def refresh():
    """Rotate refresh token: issues a brand new access and refresh token pair."""
    # Obtain refresh token: explicit payload first, then Authorization header, then cookie
    payload = request.get_json(silent=True) or {}
    refresh_token = payload.get("refresh_token")

    if not refresh_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            refresh_token = auth_header.split(" ")[1]

    if not refresh_token:
        refresh_token = request.cookies.get("refresh_token_cookie")

    if not refresh_token:
        raise APIException(
            message="Refresh token missing from cookie, header, or payload.",
            status_code=401,
            error_code="REFRESH_TOKEN_REQUIRED"
        )

    try:
        decoded = decode_token(refresh_token)
    except Exception as e:
        raise APIException(
            message=f"Invalid or expired refresh token: {str(e)}",
            status_code=401,
            error_code="INVALID_REFRESH_TOKEN"
        )

    if decoded.get("type") != "refresh":
        raise APIException(
            message="Submitted token is not a valid refresh token.",
            status_code=401,
            error_code="INVALID_TOKEN_TYPE"
        )

    new_access_token, new_refresh_token = _auth_service().rotate_refresh_token(
        refresh_payload=decoded,
        ip_address=request.remote_addr
    )

    response = jsonify({
        "success": True,
        "data": {
            "access_token": new_access_token,
            "token_type": "Bearer",
            "expires_in": 900,
        },
        "message": "Session successfully refreshed."
    })

    secure_cookie = current_app.config.get("JWT_COOKIE_SECURE", False)
    response.set_cookie(
        key="refresh_token_cookie",
        value=new_refresh_token,
        httponly=True,
        secure=secure_cookie,
        samesite="Lax",
        path="/api/v1/auth",
        max_age=7 * 86400,
    )

    return response, 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    """Revoke active access and refresh tokens for current session."""
    access_claims = get_jwt()
    user_id = uuid.UUID(get_jwt_identity())

    # Check for refresh token in cookie
    refresh_token = request.cookies.get("refresh_token_cookie")
    refresh_claims = None
    if refresh_token:
        try:
            refresh_claims = decode_token(refresh_token)
        except Exception:
            pass

    _auth_service().logout_current_session(
        access_payload=access_claims,
        refresh_payload=refresh_claims,
        user_id=user_id,
    )

    response = jsonify({
        "success": True,
        "message": "Successfully logged out from current session."
    })

    # Clear refresh cookie
    response.delete_cookie(
        key="refresh_token_cookie",
        path="/api/v1/auth"
    )

    return response, 200


@auth_bp.route("/logout-all", methods=["POST"])
@jwt_required()
def logout_all():
    """Terminate and invalidate all active sessions for the authenticated user."""
    user_id = uuid.UUID(get_jwt_identity())
    _auth_service().logout_all_sessions(user_id=user_id)

    response = jsonify({
        "success": True,
        "message": "Successfully logged out from all active sessions."
    })
    response.delete_cookie(key="refresh_token_cookie", path="/api/v1/auth")
    return response, 200


@auth_bp.route("/forgot-password", methods=["POST"])
@limiter.limit("5 per hour")
def forgot_password():
    """Request a single-use password reset link via registered email."""
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    frontend_url = data.get("frontend_url")

    message = _auth_service().request_password_reset(
        email=email,
        ip_address=request.remote_addr,
        frontend_url=frontend_url
    )

    return jsonify({
        "success": True,
        "message": message
    }), 200


@auth_bp.route("/request-otp", methods=["POST"])
@limiter.limit("10 per hour")
def request_otp():
    """Request a 6-digit OTP for password reset, prioritizing registered mobile number."""
    data = request.get_json(silent=True) or {}
    identifier = data.get("identifier") or data.get("mobile") or data.get("email") or data.get("username")
    channel = data.get("channel", "sms")

    from app.services.otp_service import OTPService
    res = OTPService.request_otp(
        identifier=identifier,
        user_resolver_fn=_auth_service().find_user_by_identifier,
        channel=channel,
    )
    return jsonify({
        "success": True,
        "message": f"Verification code sent via SMS to {res['masked_phone']}. Valid for 10 minutes.",
        "data": res
    }), 200


@auth_bp.route("/verify-otp", methods=["POST"])
@limiter.limit("20 per hour")
def verify_otp():
    """Verify submitted 6-digit OTP code and issue a single-use reset authorization token."""
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")
    otp_code = data.get("otp") or data.get("otp_code")

    from app.services.otp_service import OTPService
    res = OTPService.verify_otp(session_id=session_id, otp_code=otp_code)
    return jsonify({
        "success": True,
        "message": res["message"],
        "data": res
    }), 200


@auth_bp.route("/reset-password-otp", methods=["POST"])
@limiter.limit("10 per hour")
def reset_password_with_otp():
    """Reset password using verified OTP authorization token."""
    data = request.get_json(silent=True) or {}
    reset_token = data.get("reset_token")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")

    from app.services.otp_service import OTPService
    res = OTPService.reset_password(
        reset_token=reset_token,
        new_password=new_password,
        confirm_password=confirm_password,
        password_updater_fn=lambda uid, pw: _auth_service().update_user_password(uid, pw, False),
    )
    return jsonify({
        "success": True,
        "message": res["message"]
    }), 200


@auth_bp.route("/first-login-change-password", methods=["POST"])
@jwt_required()
def first_login_change_password():
    """Mandatory first-login password update for accounts created with temporary credentials."""
    user_id_str = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")

    _auth_service().change_password(
        user_id=user_id_str,
        current_password=current_password,
        new_password=new_password,
        confirm_password=confirm_password,
        ip_address=request.remote_addr,
    )
    return jsonify({
        "success": True,
        "message": "Temporary password updated successfully. Welcome to your workspace!"
    }), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Set new password using a valid cryptographic reset token."""
    data = request.get_json(silent=True) or {}
    token = data.get("token")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")

    _auth_service().reset_password(
        token=token,
        new_password=new_password,
        confirm_password=confirm_password,
        ip_address=request.remote_addr,
    )

    return jsonify({
        "success": True,
        "message": "Your password has been successfully reset. Please log in with your new credentials."
    }), 200


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    """Change password for the currently authenticated user."""
    user_id = uuid.UUID(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")

    _auth_service().change_password(
        user_id=user_id,
        current_password=current_password,
        new_password=new_password,
        confirm_password=confirm_password,
        ip_address=request.remote_addr,
    )

    return jsonify({
        "success": True,
        "message": "Your password has been successfully changed."
    }), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user_profile():
    """Retrieve full profile, assigned institution, roles, permissions, and domain reference IDs."""
    user_id = uuid.UUID(get_jwt_identity())
    if is_dev_auth_active():
        profile = DevAuthService.get_profile(user_id)
        if not profile:
            raise APIException(message="User not found.", status_code=404, error_code="USER_NOT_FOUND")
        return jsonify({
            "success": True,
            "data": profile,
            "message": "User profile retrieved successfully (development auth mode; no database)."
        }), 200

    user = db.session.get(User, user_id)

    if not user:
        raise APIException(message="User not found.", status_code=404, error_code="USER_NOT_FOUND")

    inst_data = None
    if user.institution:
        inst_data = {
            "id": str(user.institution.id),
            "code": user.institution.code,
            "name": user.institution.name,
            "subdomain": user.institution.subdomain,
            "board_affiliation": user.institution.board_affiliation,
            "currency": user.institution.currency,
            "status": user.institution.status,
            "logo_url": user.institution.logo_url,
        }

    # Reference profiles
    reference_data = {}
    student_profile = Student.query.filter_by(user_id=user.id).first()
    if student_profile:
        reference_data["student_id"] = str(student_profile.id)
        reference_data["admission_number"] = student_profile.admission_number

    staff_profile = StaffProfile.query.filter_by(user_id=user.id).first()
    if staff_profile:
        reference_data["staff_id"] = str(staff_profile.id)
        reference_data["employee_id"] = staff_profile.employee_id
        reference_data["designation"] = staff_profile.designation

    parent_profile = Parent.query.filter_by(user_id=user.id).first()
    if parent_profile:
        reference_data["parent_id"] = str(parent_profile.id)
        # Linked children list
        children = [
            {
                "student_id": str(sp.student_id),
                "admission_number": sp.student.admission_number,
                "first_name": sp.student.user.first_name if sp.student.user else "",
                "last_name": sp.student.user.last_name if sp.student.user else "",
                "is_primary": sp.is_primary_contact,
            }
            for sp in parent_profile.student_parents
            if sp.student
        ]
        reference_data["linked_children"] = children

    return jsonify({
        "success": True,
        "data": {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.full_name,
            "phone": user.phone,
            "avatar_url": user.avatar_url,
            "roles": user.role_names,
            "permissions": user.permissions,
            "institution_id": str(user.institution_id) if user.institution_id else None,
            "institution": inst_data,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "references": reference_data,
        },
        "message": "User profile retrieved successfully."
    }), 200


@auth_bp.route("/me", methods=["PUT"])
@jwt_required()
def update_current_user_profile():
    """Update profile information (first_name, last_name, phone, avatar_url)."""
    user_id = uuid.UUID(get_jwt_identity())
    if is_dev_auth_active():
        # Profile changes must be persisted; refuse rather than pretend to save.
        raise DatabaseUnavailableError()
    user = db.session.get(User, user_id)

    if not user:
        raise APIException(message="User not found.", status_code=404, error_code="USER_NOT_FOUND")

    data = request.get_json(silent=True) or {}
    if "first_name" in data and data["first_name"]:
        user.first_name = data["first_name"].strip()
    if "last_name" in data and data["last_name"]:
        user.last_name = data["last_name"].strip()
    if "phone" in data:
        user.phone = data["phone"].strip() if data["phone"] else None
    if "avatar_url" in data:
        user.avatar_url = data["avatar_url"].strip() if data["avatar_url"] else None

    db.session.commit()

    return jsonify({
        "success": True,
        "data": {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.full_name,
            "phone": user.phone,
            "avatar_url": user.avatar_url,
        },
        "message": "Profile updated successfully."
    }), 200
