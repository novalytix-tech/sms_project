import uuid
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.decorators import (
    role_required, permission_required, institution_required,
    verify_parent_access, verify_teacher_class_access, verify_tenant_access
)

test_bp = Blueprint("test_rbac", __name__, url_prefix="/test")


@test_bp.route("/admin-only", methods=["GET"])
@role_required("school_admin")
def admin_only():
    return jsonify({"success": True, "message": "Admin access granted."}), 200


@test_bp.route("/teacher-only", methods=["GET"])
@role_required("teacher")
def teacher_only():
    return jsonify({"success": True, "message": "Teacher access granted."}), 200


@test_bp.route("/finance-write", methods=["GET"])
@permission_required("finance:write")
def finance_write():
    return jsonify({"success": True, "message": "Finance write permission granted."}), 200


@test_bp.route("/parent-child/<uuid:student_id>", methods=["GET"])
@jwt_required()
def parent_child_access(student_id):
    user_id = uuid.UUID(get_jwt_identity())
    verify_parent_access(user_id, student_id)
    return jsonify({"success": True, "message": "Parent access to child verified."}), 200


@test_bp.route("/teacher-class/<uuid:section_id>", methods=["GET"])
@jwt_required()
def teacher_class_access(section_id):
    user_id = uuid.UUID(get_jwt_identity())
    verify_teacher_class_access(user_id, section_id)
    return jsonify({"success": True, "message": "Teacher access to section verified."}), 200


@test_bp.route("/tenant-guard/<uuid:inst_id>", methods=["GET"])
@jwt_required()
def tenant_guard_access(inst_id):
    verify_tenant_access(inst_id)
    return jsonify({"success": True, "message": "Tenant access verified."}), 200

