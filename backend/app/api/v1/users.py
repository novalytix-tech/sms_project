"""School account management.

An administrator provisions an account (name, email, role). The person then receives
a Clerk invitation email, creates their own password/passkey with Clerk, and is linked
to this account automatically on first sign-in. No passwords ever touch this server.
"""
import re
import secrets
import uuid

import requests
from flask import Blueprint, current_app, g, jsonify, request

from app.auth import ADMIN, is_super_admin, role_required
from app.auth.clerk import create_invitation
from app.extensions import db, limiter
from app.models import Role, User, UserRole
from app.utils.errors import APIException
from app.utils.tenant import ensure_same_tenant, get_current_tenant_id

users_bp = Blueprint("users", __name__, url_prefix="/users")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ASSIGNABLE_ROLES = {"school_admin", "teacher", "student", "parent", "supplier"}
LOGIN_PREFIX = {"student": "STU", "teacher": "TCH", "parent": "PAR", "supplier": "SUP", "school_admin": "ADM"}


def _serialize(u: User) -> dict:
    roles = u.role_names
    return {
        "id": str(u.id),
        "login_id": u.username,
        "username": u.username,
        "email": u.email,
        "phone": u.phone,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "full_name": u.full_name,
        "role": roles[0] if roles else None,
        "roles": roles,
        "is_active": u.is_active,
        "status": "active" if u.is_active else "deactivated",
        "sign_in_linked": bool(u.clerk_user_id),
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
    }


def _get_user_in_tenant(user_id: str) -> User:
    try:
        uid = uuid.UUID(str(user_id))
    except ValueError:
        raise APIException("User not found.", status_code=404, error_code="NOT_FOUND")
    user = db.session.get(User, uid)
    if not user or user.is_deleted:
        raise APIException("User not found.", status_code=404, error_code="NOT_FOUND")
    ensure_same_tenant(user.institution_id)
    if "super_admin" in user.role_names and not is_super_admin():
        raise APIException("User not found.", status_code=404, error_code="NOT_FOUND")
    return user


def _send_invite(email: str) -> str:
    try:
        create_invitation(email, redirect_url=f"{current_app.config['FRONTEND_URL']}/login")
        return "invited"
    except requests.RequestException:
        current_app.logger.exception("Clerk invitation failed for a new account")
        return "invite_failed"


@users_bp.route("", methods=["GET"])
@role_required(*ADMIN)
def list_user_accounts():
    tenant_id = get_current_tenant_id()
    query = User.query.filter(User.is_deleted.is_(False))
    if tenant_id:
        query = query.filter(User.institution_id == tenant_id)

    search = (request.args.get("search") or "").strip()[:100]
    if search:
        like = f"%{search}%"
        query = query.filter(
            User.email.ilike(like) | User.username.ilike(like) | User.first_name.ilike(like)
            | User.last_name.ilike(like) | User.phone.ilike(like)
        )
    role_filter = request.args.get("role")
    if role_filter:
        query = query.join(UserRole).join(Role).filter(Role.name == role_filter)
    status_filter = request.args.get("status")
    if status_filter in ("active", "deactivated"):
        query = query.filter(User.is_active.is_(status_filter == "active"))

    users = [u for u in query.order_by(User.created_at.desc()).limit(1000).all()
             if is_super_admin() or "super_admin" not in u.role_names]
    return jsonify({"success": True, "data": [_serialize(u) for u in users]}), 200


@users_bp.route("", methods=["POST"])
@role_required(*ADMIN)
@limiter.limit("60 per hour")
def create_user_account():
    data = request.get_json(silent=True) or {}
    first_name = str(data.get("first_name") or data.get("firstName") or "").strip()[:100]
    last_name = str(data.get("last_name") or data.get("lastName") or "").strip()[:100]
    email = str(data.get("email") or "").strip().lower()
    phone = str(data.get("phone") or "").strip()[:50] or None
    role_name = str(data.get("role") or "").strip().lower()

    if not first_name or not last_name:
        raise APIException("First name and last name are required.", status_code=422, error_code="VALIDATION_ERROR")
    if not EMAIL_RE.match(email) or len(email) > 255:
        raise APIException("A valid email address is required to send the sign-in invitation.",
                           status_code=422, error_code="VALIDATION_ERROR")
    if role_name not in ASSIGNABLE_ROLES:
        raise APIException("Invalid role.", status_code=422, error_code="VALIDATION_ERROR")

    tenant_id = get_current_tenant_id(required=True)
    if User.query.filter(db.func.lower(User.email) == email).first():
        raise APIException("An account with this email already exists.", status_code=409, error_code="CONFLICT")

    role = Role.query.filter_by(name=role_name).first()
    if not role:
        raise APIException("Role is not configured in the database.", status_code=500, error_code="ROLE_MISSING")

    username = f"{LOGIN_PREFIX[role_name]}-{secrets.token_hex(3).upper()}"
    user = User(
        institution_id=tenant_id,
        username=username,
        email=email,
        phone=phone,
        first_name=first_name,
        last_name=last_name,
        is_active=True,
        is_verified=False,
    )
    db.session.add(user)
    db.session.flush()
    db.session.add(UserRole(user_id=user.id, role_id=role.id))
    db.session.commit()

    result = _serialize(user)
    result["invitation_status"] = _send_invite(email)
    return jsonify({"success": True, "message": f"Account created for {user.full_name}.", "data": result}), 201


@users_bp.route("/<user_id>/toggle-status", methods=["POST"])
@role_required(*ADMIN)
def toggle_user_status(user_id):
    user = _get_user_in_tenant(user_id)
    if user.id == g.user_id:
        raise APIException("You cannot deactivate your own account.", status_code=400)
    user.is_active = not user.is_active
    db.session.commit()
    return jsonify({"success": True, "data": _serialize(user)}), 200


@users_bp.route("/<user_id>/resend-invitation", methods=["POST"])
@role_required(*ADMIN)
@limiter.limit("20 per hour")
def resend_invitation(user_id):
    user = _get_user_in_tenant(user_id)
    if user.clerk_user_id:
        raise APIException("This user has already set up their sign-in.", status_code=400)
    status = _send_invite(user.email)
    if status != "invited":
        raise APIException("Could not send the invitation. Try again later.", status_code=502,
                           error_code="INVITE_FAILED")
    return jsonify({"success": True, "data": {"invitation_status": status}}), 200
