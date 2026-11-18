import uuid
from datetime import date, datetime
from flask import g, Blueprint, request, jsonify
from app.auth import ADMIN, STAFF, role_required
from app.utils.tenant import ensure_same_tenant
from app.extensions import db
from app.models import StudentAttendance, StaffAttendance, StudentEnrollment, User
from app.utils.tenant import get_current_tenant_id
from app.utils.errors import APIException

attendance_bp = Blueprint("attendance", __name__, url_prefix="/attendance")


# -------------------------------------------------------------
# 1. Student Attendance
# -------------------------------------------------------------

@attendance_bp.route("/students", methods=["GET"])
@role_required(*STAFF)
def get_student_attendance():
    date_str = request.args.get("date")
    section_id = request.args.get("section_id")

    query = StudentAttendance.query
    if date_str:
        att_date = datetime.strptime(str(date_str)[:10], "%Y-%m-%d").date()
        query = query.filter(StudentAttendance.attendance_date == att_date)

    if section_id:
        query = query.join(StudentEnrollment).filter(StudentEnrollment.section_id == uuid.UUID(section_id))

    records = query.all()
    data = [
        {
            "id": str(r.id),
            "enrollment_id": str(r.enrollment_id),
            "student_id": str(r.enrollment.student_id) if r.enrollment else None,
            "student_name": r.enrollment.student.user.full_name if r.enrollment and r.enrollment.student and r.enrollment.student.user else "Student",
            "roll_number": r.enrollment.roll_number if r.enrollment else None,
            "attendance_date": r.attendance_date.isoformat(),
            "status": r.status,
            "remarks": r.remarks,
        }
        for r in records
    ]
    return jsonify({"success": True, "data": data}), 200


@attendance_bp.route("/students/batch", methods=["POST"])
@role_required(*STAFF)
def record_student_attendance_batch():
    """Bulk mark attendance for an entire classroom section."""
    payload = request.get_json() or {}
    items = payload.get("records") or payload.get("items") or []
    date_str = payload.get("date")
    att_date = datetime.strptime(str(date_str)[:10], "%Y-%m-%d").date() if date_str else date.today()

    recorded_by_id = g.user_id

    results = []
    for item in items:
        enrollment_id_str = item.get("enrollment_id") or item.get("enrollmentId")
        if not enrollment_id_str and item.get("student_id"):
            # Lookup active enrollment for student
            enrollment = StudentEnrollment.query.filter_by(
                student_id=uuid.UUID(str(item.get("student_id"))),
                status="ACTIVE"
            ).first()
            if enrollment:
                enrollment_id_str = str(enrollment.id)

        if not enrollment_id_str:
            continue

        e_uuid = uuid.UUID(str(enrollment_id_str))
        enrollment = db.session.get(StudentEnrollment, e_uuid)
        if not enrollment:
            continue
        ensure_same_tenant(enrollment.student.institution_id)
        status = item.get("status", "PRESENT").upper()

        existing = StudentAttendance.query.filter_by(
            enrollment_id=e_uuid,
            attendance_date=att_date
        ).first()

        if existing:
            existing.status = status
            existing.remarks = item.get("remarks")
            results.append(str(existing.id))
        else:
            new_rec = StudentAttendance(
                enrollment_id=e_uuid,
                attendance_date=att_date,
                status=status,
                remarks=item.get("remarks"),
                recorded_by=recorded_by_id,
            )
            db.session.add(new_rec)
            db.session.flush()
            results.append(str(new_rec.id))

    db.session.commit()
    return jsonify({
        "success": True,
        "data": {"count": len(results), "date": att_date.isoformat()},
        "message": f"Successfully recorded attendance for {len(results)} students."
    }), 200


# -------------------------------------------------------------
# 2. Staff Attendance
# -------------------------------------------------------------

@attendance_bp.route("/staff", methods=["GET"])
@role_required(*ADMIN)
def get_staff_attendance():
    institution_id = get_current_tenant_id()
    date_str = request.args.get("date")

    query = StaffAttendance.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    if date_str:
        att_date = datetime.strptime(str(date_str)[:10], "%Y-%m-%d").date()
        query = query.filter(StaffAttendance.attendance_date == att_date)

    records = query.all()
    data = [
        {
            "id": str(r.id),
            "staff_user_id": str(r.staff_user_id),
            "staff_name": f"{r.staff_user.first_name} {r.staff_user.last_name}".strip() if r.staff_user else None,
            "attendance_date": r.attendance_date.isoformat(),
            "check_in_time": r.check_in_time.strftime("%H:%M") if r.check_in_time else None,
            "check_out_time": r.check_out_time.strftime("%H:%M") if r.check_out_time else None,
            "status": r.status,
            "remarks": r.remarks,
        }
        for r in records
    ]
    return jsonify({"success": True, "data": data}), 200

