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
from app.models import Parent, Role, Student, StudentParent, User, UserRole
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


class ProvisionError(Exception):
    """A single account row could not be provisioned (reason is shown to the admin)."""


def _clean_row(data):
    return {
        "first_name": str(data.get("first_name") or data.get("firstName") or "").strip()[:100],
        "last_name": str(data.get("last_name") or data.get("lastName") or "").strip()[:100],
        "email": str(data.get("email") or "").strip().lower(),
        "phone": str(data.get("phone") or "").strip()[:50] or None,
        "role": str(data.get("role") or "").strip().lower(),
        "admission_number": str(data.get("admission_number") or data.get("admissionNo") or "").strip()[:50],
        "children": _admission_list(data.get("child_admission_numbers") or data.get("children")),
        "relationship": str(data.get("relationship") or "Guardian").strip()[:50] or "Guardian",
    }


def _admission_list(value):
    if isinstance(value, list):
        items = value
    else:
        items = re.split(r"[;,|\s]+", str(value or ""))
    return [str(v).strip()[:50] for v in items if str(v).strip()][:20]


def _student_by_admission(tenant_id, admission_number):
    student = Student.query.filter_by(institution_id=tenant_id, admission_number=admission_number).first()
    if not student or student.is_deleted:
        raise ProvisionError(f"No student with admission number '{admission_number}' in this school.")
    return student


def _link_child(parent, student, primary=True):
    if not StudentParent.query.filter_by(parent_id=parent.id, student_id=student.id).first():
        db.session.add(StudentParent(parent_id=parent.id, student_id=student.id, is_primary_contact=primary))


def _parent_profile(user, relationship="Guardian"):
    parent = Parent.query.filter_by(user_id=user.id).first()
    if not parent:
        parent = Parent(
            institution_id=user.institution_id, user_id=user.id,
            first_name=user.first_name, last_name=user.last_name,
            relationship_type=relationship, email=user.email, phone=user.phone or "",
        )
        db.session.add(parent)
        db.session.flush()
    return parent


def _provision(row, tenant_id):
    """Create (or, for students, attach) one sign-in account. Returns the User; raises ProvisionError."""
    if not row["first_name"] or not row["last_name"]:
        raise ProvisionError("First name and last name are required.")
    if not EMAIL_RE.match(row["email"]) or len(row["email"]) > 255:
        raise ProvisionError("A valid email address is required for the sign-in invitation.")
    if row["role"] not in ASSIGNABLE_ROLES:
        raise ProvisionError("Role must be one of: " + ", ".join(sorted(ASSIGNABLE_ROLES)) + ".")
    role = Role.query.filter_by(name=row["role"]).first()
    if not role:
        raise ProvisionError("Role is not configured in the database.")

    existing = User.query.filter(db.func.lower(User.email) == row["email"]).first()

    if row["role"] == "student":
        if not row["admission_number"]:
            raise ProvisionError("Students need an admission number so the account is tied to their record.")
        student = _student_by_admission(tenant_id, row["admission_number"])
        user = student.user
        if user and user.clerk_user_id:
            raise ProvisionError("This student already has an active sign-in account.")
        if existing and (not user or existing.id != user.id):
            raise ProvisionError("This email is already used by another account.")
        if not user:
            user = User(institution_id=tenant_id, username=f"STU-{secrets.token_hex(3).upper()}", is_active=True)
            db.session.add(user)
        # Student records keep the name on their user row; attach the real email to it.
        user.email, user.first_name, user.last_name = row["email"], row["first_name"], row["last_name"]
        user.phone = row["phone"] or user.phone
        user.is_verified = False
        db.session.flush()
        student.user_id = user.id
        if not UserRole.query.filter_by(user_id=user.id, role_id=role.id).first():
            db.session.add(UserRole(user_id=user.id, role_id=role.id))
        return user

    if existing:
        raise ProvisionError("An account with this email already exists.")
    user = User(
        institution_id=tenant_id,
        username=f"{LOGIN_PREFIX[row['role']]}-{secrets.token_hex(3).upper()}",
        email=row["email"], phone=row["phone"],
        first_name=row["first_name"], last_name=row["last_name"],
        is_active=True, is_verified=False,
    )
    db.session.add(user)
    db.session.flush()
    db.session.add(UserRole(user_id=user.id, role_id=role.id))

    if row["role"] == "parent":
        parent = _parent_profile(user, row["relationship"])
        for i, adm in enumerate(row["children"]):
            _link_child(parent, _student_by_admission(tenant_id, adm), primary=(i == 0))
    return user


@users_bp.route("", methods=["POST"])
@role_required(*ADMIN)
@limiter.limit("60 per hour")
def create_user_account():
    tenant_id = get_current_tenant_id(required=True)
    row = _clean_row(request.get_json(silent=True) or {})
    try:
        user = _provision(row, tenant_id)
    except ProvisionError as exc:
        db.session.rollback()
        status = 409 if "already" in str(exc) else 422
        raise APIException(str(exc), status_code=status, error_code="CONFLICT" if status == 409 else "VALIDATION_ERROR")
    db.session.commit()

    result = _serialize(user)
    result["invitation_status"] = _send_invite(user.email)
    return jsonify({"success": True, "message": f"Account created for {user.full_name}.", "data": result}), 201


@users_bp.route("/bulk-invite", methods=["POST"])
@role_required(*ADMIN)
@limiter.limit("20 per hour")
def bulk_invite():
    """Provision many accounts from a CSV upload. Each row succeeds or fails on its own."""
    tenant_id = get_current_tenant_id(required=True)
    rows = (request.get_json(silent=True) or {}).get("rows")
    if not isinstance(rows, list) or not 1 <= len(rows) <= 500:
        raise APIException("Send between 1 and 500 rows per upload.", status_code=422, error_code="VALIDATION_ERROR")

    results, created = [], []
    seen_emails = set()
    for i, raw in enumerate(rows):
        row = _clean_row(raw if isinstance(raw, dict) else {})
        entry = {"row": i + 2, "email": row["email"], "name": f"{row['first_name']} {row['last_name']}".strip(),
                 "role": row["role"]}
        if row["email"] in seen_emails:
            results.append({**entry, "status": "skipped", "reason": "Duplicate email in this file."})
            continue
        seen_emails.add(row["email"])
        savepoint = db.session.begin_nested()
        try:
            user = _provision(row, tenant_id)
            savepoint.commit()
            created.append((entry, user))
        except ProvisionError as exc:
            savepoint.rollback()
            results.append({**entry, "status": "skipped", "reason": str(exc)})
    db.session.commit()

    for entry, user in created:
        status = _send_invite(user.email)
        results.append({**entry, "status": "created", "invitation_status": status,
                        "reason": None if status == "invited" else "Account created, but the invitation email failed."})
    results.sort(key=lambda r: r["row"])
    return jsonify({"success": True, "data": {
        "created": len(created),
        "skipped": len(rows) - len(created),
        "invitations_failed": sum(1 for r in results if r.get("invitation_status") == "invite_failed"),
        "results": results,
    }}), 200


# ------------------------------------------------------------- parent <-> children

def _children_json(parent):
    if not parent:
        return []
    links = StudentParent.query.filter_by(parent_id=parent.id).all()
    out = []
    for link in links:
        s = link.student
        enrollment = next((e for e in s.enrollments if e.status == "ACTIVE"), None)
        out.append({
            "student_id": str(s.id),
            "admission_number": s.admission_number,
            "name": s.user.full_name if s.user else s.admission_number,
            "class_name": enrollment.section.class_level.name if enrollment and enrollment.section else "",
            "section": enrollment.section.name if enrollment and enrollment.section else "",
            "is_primary": link.is_primary_contact,
        })
    return sorted(out, key=lambda c: c["admission_number"])


def _parent_user(user_id):
    user = _get_user_in_tenant(user_id)
    if "parent" not in user.role_names:
        raise APIException("This account is not a parent account.", status_code=422, error_code="VALIDATION_ERROR")
    return user


@users_bp.route("/<user_id>/children", methods=["GET"])
@role_required(*ADMIN)
def list_children(user_id):
    user = _parent_user(user_id)
    return jsonify({"success": True, "data": _children_json(Parent.query.filter_by(user_id=user.id).first())}), 200


@users_bp.route("/<user_id>/children", methods=["POST"])
@role_required(*ADMIN)
def link_child(user_id):
    user = _parent_user(user_id)
    admission = str((request.get_json(silent=True) or {}).get("admission_number") or "").strip()[:50]
    if not admission:
        raise APIException("admission_number is required.", status_code=422, error_code="VALIDATION_ERROR")
    try:
        student = _student_by_admission(user.institution_id, admission)
    except ProvisionError as exc:
        raise APIException(str(exc), status_code=404, error_code="NOT_FOUND")
    parent = _parent_profile(user)
    _link_child(parent, student, primary=not StudentParent.query.filter_by(student_id=student.id).first())
    db.session.commit()
    return jsonify({"success": True, "data": _children_json(parent)}), 200


@users_bp.route("/<user_id>/children/<student_id>", methods=["DELETE"])
@role_required(*ADMIN)
def unlink_child(user_id, student_id):
    user = _parent_user(user_id)
    parent = Parent.query.filter_by(user_id=user.id).first()
    try:
        sid = uuid.UUID(str(student_id))
    except ValueError:
        raise APIException("Invalid student id.", status_code=422, error_code="VALIDATION_ERROR")
    link = StudentParent.query.filter_by(parent_id=parent.id, student_id=sid).first() if parent else None
    if not link:
        raise APIException("This child is not linked to the parent.", status_code=404, error_code="NOT_FOUND")
    db.session.delete(link)
    db.session.commit()
    return jsonify({"success": True, "data": _children_json(parent)}), 200


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
