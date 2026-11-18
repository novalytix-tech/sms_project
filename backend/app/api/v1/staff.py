import uuid
from datetime import date, datetime
from flask import g, Blueprint, request, jsonify
from app.auth import ADMIN, STAFF, role_required
from app.utils.tenant import ensure_same_tenant
from app.extensions import db
from app.models import StaffProfile, TeacherProfile, Department, LeaveRequest, LeaveCategory, LeaveApproval, User
from app.utils.tenant import get_current_tenant_id
from app.utils.errors import APIException

staff_bp = Blueprint("staff", __name__, url_prefix="/staff")


# -------------------------------------------------------------
# 1. Staff Profiles
# -------------------------------------------------------------

@staff_bp.route("", methods=["GET"])
@role_required(*STAFF)
def list_staff():
    institution_id = get_current_tenant_id()
    query = StaffProfile.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    status = request.args.get("status")
    if status:
        query = query.filter_by(status=status.upper())

    staff_members = query.all()
    data = []
    for s in staff_members:
        u = s.user
        data.append({
            "id": str(s.id),
            "user_id": str(s.user_id),
            "employee_id": s.employee_id,
            "first_name": u.first_name if u else "Staff",
            "last_name": u.last_name if u else "",
            "full_name": f"{u.first_name} {u.last_name}".strip() if u else "Staff Member",
            "email": u.email if u else None,
            "phone": u.phone if u else None,
            "designation": s.designation,
            "department_id": str(s.department_id) if s.department_id else None,
            "department_name": s.department.name if s.department else None,
            "joining_date": s.joining_date.isoformat(),
            "status": s.status,
        })
    return jsonify({"success": True, "data": data}), 200


@staff_bp.route("/departments", methods=["GET"])
@role_required(*STAFF)
def list_departments():
    institution_id = get_current_tenant_id()
    query = Department.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    depts = query.order_by(Department.name.asc()).all()
    data = [{"id": str(d.id), "name": d.name} for d in depts]
    return jsonify({"success": True, "data": data}), 200


# -------------------------------------------------------------
# 2. Leave Management
# -------------------------------------------------------------

@staff_bp.route("/leaves", methods=["GET"])
@role_required(*STAFF)
def list_leaves():
    institution_id = get_current_tenant_id()
    query = LeaveRequest.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    status = request.args.get("status")
    if status:
        query = query.filter_by(status=status.upper())

    leaves = query.order_by(LeaveRequest.start_date.desc()).all()
    data = [
        {
            "id": str(l.id),
            "applicant_id": str(l.applicant_user_id),
            "applicant_name": f"{l.applicant.first_name} {l.applicant.last_name}".strip() if l.applicant else None,
            "category_name": l.category.name if l.category else None,
            "start_date": l.start_date.isoformat(),
            "end_date": l.end_date.isoformat(),
            "total_days": float(l.total_days),
            "reason": l.reason,
            "status": l.status,
        }
        for l in leaves
    ]
    return jsonify({"success": True, "data": data}), 200


@staff_bp.route("/leaves/<uuid:leave_id>/action", methods=["PUT"])
@role_required(*ADMIN)
def take_leave_action(leave_id):
    leave = LeaveRequest.query.filter_by(id=leave_id).first()
    if not leave:
        raise APIException("Leave request not found", status_code=404)
    ensure_same_tenant(leave.institution_id)

    payload = request.get_json() or {}
    action = payload.get("action", "").upper()  # APPROVED, REJECTED
    if action not in {"APPROVED", "REJECTED"}:
        raise APIException("Action must be either APPROVED or REJECTED", status_code=400)

    approver_id = str(g.user_id)

    leave.status = action
    approval = LeaveApproval(
        leave_request_id=leave.id,
        approver_user_id=uuid.UUID(str(approver_id)),
        decision=action,
        comments=payload.get("comments"),
    )
    db.session.add(approval)
    db.session.commit()

    return jsonify({
        "success": True,
        "data": {"id": str(leave.id), "status": leave.status},
        "message": f"Leave request {action.lower()}."
    }), 200
