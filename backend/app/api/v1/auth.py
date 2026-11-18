from flask import Blueprint, g, jsonify, request

from app.extensions import db
from app.models import Parent, StaffProfile, Student
from app.utils.errors import APIException

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

# Sign-in, sign-up, password reset, MFA and sessions are handled entirely by Clerk.
# The backend only exposes the signed-in user's school profile.


@auth_bp.route("/me", methods=["GET"])
def get_current_user_profile():
    """Retrieve full profile, assigned institution, roles, permissions, and domain reference IDs."""
    user = g.current_user

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
def update_current_user_profile():
    """Update profile information (first_name, last_name, phone, avatar_url)."""
    user = g.current_user

    data = request.get_json(silent=True) or {}

    def text(field, max_len):
        value = data.get(field)
        if value is None or value == "":
            return None
        if not isinstance(value, str) or len(value.strip()) > max_len:
            raise APIException(f"{field} must be text of at most {max_len} characters.", status_code=422,
                               error_code="VALIDATION_ERROR")
        return value.strip()

    if text("first_name", 100):
        user.first_name = text("first_name", 100)
    if text("last_name", 100):
        user.last_name = text("last_name", 100)
    if "phone" in data:
        user.phone = text("phone", 50)
    if "avatar_url" in data:
        avatar = text("avatar_url", 500)
        if avatar and not avatar.startswith("https://"):
            raise APIException("avatar_url must be an https:// URL.", status_code=422, error_code="VALIDATION_ERROR")
        user.avatar_url = avatar

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
