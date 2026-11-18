"""Student and staff attendance.

Student attendance
  - school_admin: any section of their school
  - teacher: only sections they are class teacher of or teach a subject in
  - parent: read-only, linked children only; student: read-only, own records only
Staff attendance
  - school_admin marks and corrects (corrections need a reason and are audit-logged)
  - teacher: read-only, own records only
"""
import uuid
from datetime import date, datetime, timedelta

from flask import Blueprint, g, jsonify, request
from sqlalchemy.orm import selectinload

from app.auth import ADMIN, STAFF, role_required
from app.extensions import db
from app.models import (
    AttendanceAuditCorrection, ClassLevel, ClassSubject, Parent, Section, StaffAttendance,
    StaffProfile, Student, StudentAttendance, StudentEnrollment, StudentParent, TeacherAssignment, User,
)
from app.utils.errors import APIException
from app.utils.tenant import ensure_same_tenant, get_current_tenant_id

attendance_bp = Blueprint("attendance", __name__, url_prefix="/attendance")

STUDENT_STATUSES = {"present", "absent", "late", "excused"}
STAFF_STATUSES = {"present", "absent", "late", "half_day", "on_leave"}
VIEWERS = ("school_admin", "teacher", "parent", "student")
MAX_RANGE_DAYS = 400
MAX_BATCH = 500


def _fail(message, status=422, code="VALIDATION_ERROR"):
    raise APIException(message, status_code=status, error_code=code)


def _parse_date(value, field="date", allow_future=False):
    try:
        d = datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except (TypeError, ValueError):
        _fail(f"{field} must be a date (YYYY-MM-DD).")
    if not allow_future and d > date.today():
        _fail("Attendance cannot be recorded for a future date.")
    return d


def _uuid(value, field):
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError):
        _fail(f"Invalid {field}.")


def _time(value):
    if value in (None, ""):
        return None
    try:
        return datetime.strptime(str(value)[:5], "%H:%M").time()
    except ValueError:
        _fail("Times must be HH:MM.")


def _date_range():
    """Optional ?date= or ?from=&to= filter (bounded)."""
    if request.args.get("date"):
        d = _parse_date(request.args["date"], allow_future=True)
        return d, d
    start = _parse_date(request.args["from"], "from", True) if request.args.get("from") else None
    end = _parse_date(request.args["to"], "to", True) if request.args.get("to") else None
    if start and end and (end - start).days > MAX_RANGE_DAYS:
        _fail("Date range is too large.")
    return start, end


# ------------------------------------------------------------- access helpers

def _is_admin():
    return bool(g.roles & {"super_admin", "school_admin"})


def _teacher_section_ids():
    taught = (
        db.session.query(ClassSubject.section_id)
        .join(TeacherAssignment, TeacherAssignment.class_subject_id == ClassSubject.id)
        .filter(TeacherAssignment.teacher_id == g.user_id)
    )
    own = db.session.query(Section.id).filter(Section.class_teacher_id == g.user_id)
    return {row[0] for row in taught.union(own).all()}


def _visible_student_ids():
    """None = no student restriction (admin/teacher handled by section)."""
    if g.roles & {"super_admin", "school_admin", "teacher"}:
        return None
    if "parent" in g.roles:
        parent = Parent.query.filter_by(user_id=g.user_id).first()
        return {sp.student_id for sp in StudentParent.query.filter_by(parent_id=parent.id)} if parent else set()
    if "student" in g.roles:
        return {s.id for s in Student.query.filter_by(user_id=g.user_id)}
    return set()


def _section_in_school(section_id):
    section = Section.query.options(selectinload(Section.class_level)).filter(Section.id == section_id).first()
    if not section or not section.class_level:
        _fail("Class section not found.", 404, "NOT_FOUND")
    ensure_same_tenant(section.class_level.institution_id)
    return section


# ------------------------------------------------------------- student attendance

def _student_json(rec):
    enr = rec.enrollment
    return {
        "id": str(rec.id),
        "studentId": str(enr.student_id),
        "classId": str(enr.section_id),
        "section": enr.section.name if enr.section else "",
        "date": rec.attendance_date.isoformat(),
        "status": rec.status.lower(),
        "remarks": rec.remarks,
        "institutionId": str(enr.student.institution_id) if enr.student else None,
    }


@attendance_bp.route("/students", methods=["GET"])
@role_required(*VIEWERS)
def list_student_attendance():
    query = (
        StudentAttendance.query
        .join(StudentEnrollment, StudentAttendance.enrollment_id == StudentEnrollment.id)
        .join(Student, StudentEnrollment.student_id == Student.id)
        .options(
            selectinload(StudentAttendance.enrollment).selectinload(StudentEnrollment.section),
            selectinload(StudentAttendance.enrollment).selectinload(StudentEnrollment.student),
        )
    )
    tenant_id = get_current_tenant_id()
    if tenant_id:
        query = query.filter(Student.institution_id == tenant_id)

    visible = _visible_student_ids()
    if visible is not None:
        query = query.filter(Student.id.in_(visible or [uuid.uuid4()]))
    elif "teacher" in g.roles and not _is_admin():
        query = query.filter(StudentEnrollment.section_id.in_(_teacher_section_ids() or [uuid.uuid4()]))

    if request.args.get("class_id"):
        query = query.filter(StudentEnrollment.section_id == _uuid(request.args["class_id"], "class_id"))
    if request.args.get("student_id"):
        query = query.filter(Student.id == _uuid(request.args["student_id"], "student_id"))
    start, end = _date_range()
    if start:
        query = query.filter(StudentAttendance.attendance_date >= start)
    if end:
        query = query.filter(StudentAttendance.attendance_date <= end)
    if not (start or end or request.args.get("student_id")) and visible is None:
        # Staff without filters: default to the last 31 days to keep responses small.
        query = query.filter(StudentAttendance.attendance_date >= date.today() - timedelta(days=31))

    records = query.order_by(StudentAttendance.attendance_date.desc()).limit(20000).all()
    return jsonify({"success": True, "data": [_student_json(r) for r in records]}), 200


@attendance_bp.route("/students/batch", methods=["POST"])
@role_required(*STAFF)
def save_student_attendance():
    """Save a class roll call. status 'not_marked' removes an existing mark."""
    data = request.get_json(silent=True) or {}
    att_date = _parse_date(data.get("date"))
    section = _section_in_school(_uuid(data.get("classId") or data.get("section_id"), "classId"))
    if "teacher" in g.roles and not _is_admin() and section.id not in _teacher_section_ids():
        _fail("You are not assigned to take attendance for this class.", 403, "FORBIDDEN")

    items = data.get("records") or []
    if not isinstance(items, list) or len(items) > MAX_BATCH:
        _fail(f"records must be a list of at most {MAX_BATCH} entries.")

    enrollments = {
        e.student_id: e
        for e in StudentEnrollment.query.filter_by(section_id=section.id, status="ACTIVE").all()
    }
    existing = {
        r.enrollment_id: r
        for r in StudentAttendance.query.filter(
            StudentAttendance.enrollment_id.in_([e.id for e in enrollments.values()] or [uuid.uuid4()]),
            StudentAttendance.attendance_date == att_date,
        )
    }

    saved, removed = 0, 0
    for item in items:
        student_id = _uuid(item.get("studentId") or item.get("student_id"), "studentId")
        enrollment = enrollments.get(student_id)
        if not enrollment:
            _fail("A student in this roll call is not enrolled in the selected class.")
        status = str(item.get("status") or "").lower()
        remarks = (str(item.get("remarks")).strip()[:500] or None) if item.get("remarks") else None
        current = existing.get(enrollment.id)

        if status == "not_marked":
            if current:
                db.session.delete(current)
                removed += 1
            continue
        if status not in STUDENT_STATUSES:
            _fail("Invalid attendance status.")

        if current:
            if current.status.lower() != status and att_date < date.today():
                db.session.add(AttendanceAuditCorrection(
                    attendance_id=current.id, attendance_type="STUDENT",
                    previous_status=current.status, corrected_status=status.upper(),
                    correction_reason="Updated from class roll call", corrected_by=g.user_id,
                ))
            current.status = status.upper()
            current.remarks = remarks
            current.recorded_by = g.user_id
        else:
            db.session.add(StudentAttendance(
                enrollment_id=enrollment.id, attendance_date=att_date, status=status.upper(),
                remarks=remarks, recorded_by=g.user_id,
            ))
        saved += 1

    db.session.commit()
    return jsonify({"success": True, "data": {"saved": saved, "removed": removed, "date": att_date.isoformat()}}), 200


# ------------------------------------------------------------- staff attendance

def _staff_json(rec, profile, correction):
    user = rec.staff_user
    return {
        "id": str(rec.id),
        "teacherId": str(rec.staff_user_id),
        "staffId": profile.employee_id if profile else "",
        "staffName": user.full_name if user else "",
        "department": profile.department.name if profile and getattr(profile, "department", None) else "General",
        "date": rec.attendance_date.isoformat(),
        "status": rec.status.lower(),
        "checkInTime": rec.check_in_time.strftime("%H:%M") if rec.check_in_time else None,
        "checkOutTime": rec.check_out_time.strftime("%H:%M") if rec.check_out_time else None,
        "remarks": rec.remarks,
        "isCorrected": correction is not None,
        "previousStatus": correction.previous_status.lower() if correction else None,
        "correctedBy": correction.corrector.full_name if correction and correction.corrector else None,
        "correctedAt": correction.created_at.isoformat() if correction else None,
        "correctionReason": correction.correction_reason if correction else None,
        "updatedAt": rec.updated_at.isoformat() if rec.updated_at else None,
        "institutionId": str(rec.institution_id),
    }


def _serialize_staff(records):
    user_ids = {r.staff_user_id for r in records}
    profiles = {
        p.user_id: p
        for p in StaffProfile.query.options(selectinload(StaffProfile.department))
        .filter(StaffProfile.user_id.in_(user_ids or [uuid.uuid4()]))
    }
    corrections = {}
    for c in (
        AttendanceAuditCorrection.query.options(selectinload(AttendanceAuditCorrection.corrector))
        .filter(AttendanceAuditCorrection.attendance_type == "STAFF",
                AttendanceAuditCorrection.attendance_id.in_([r.id for r in records] or [uuid.uuid4()]))
        .order_by(AttendanceAuditCorrection.created_at.asc())
    ):
        corrections[c.attendance_id] = c  # keep the latest
    return [_staff_json(r, profiles.get(r.staff_user_id), corrections.get(r.id)) for r in records]


def _staff_member_in_school(user_id):
    user = db.session.get(User, user_id)
    if not user or user.is_deleted:
        _fail("Staff member not found.", 404, "NOT_FOUND")
    ensure_same_tenant(user.institution_id)
    if not StaffProfile.query.filter_by(user_id=user.id).first() and "teacher" not in user.role_names:
        _fail("This person is not a staff member.", 422)
    return user


@attendance_bp.route("/staff", methods=["GET"])
@role_required(*STAFF)
def list_staff_attendance():
    query = StaffAttendance.query.options(selectinload(StaffAttendance.staff_user))
    tenant_id = get_current_tenant_id()
    if tenant_id:
        query = query.filter(StaffAttendance.institution_id == tenant_id)
    if not _is_admin():
        query = query.filter(StaffAttendance.staff_user_id == g.user_id)
    elif request.args.get("teacher_id"):
        query = query.filter(StaffAttendance.staff_user_id == _uuid(request.args["teacher_id"], "teacher_id"))
    start, end = _date_range()
    if start:
        query = query.filter(StaffAttendance.attendance_date >= start)
    if end:
        query = query.filter(StaffAttendance.attendance_date <= end)
    records = query.order_by(StaffAttendance.attendance_date.desc()).limit(20000).all()
    return jsonify({"success": True, "data": _serialize_staff(records)}), 200


@attendance_bp.route("/staff/batch", methods=["POST"])
@role_required(*ADMIN)
def save_staff_attendance():
    tenant_id = get_current_tenant_id(required=True)
    data = request.get_json(silent=True) or {}
    items = data.get("records") or []
    if not isinstance(items, list) or not 1 <= len(items) <= MAX_BATCH:
        _fail(f"records must contain between 1 and {MAX_BATCH} entries.")

    saved = []
    for item in items:
        user = _staff_member_in_school(_uuid(item.get("teacherId"), "teacherId"))
        att_date = _parse_date(item.get("date"))
        status = str(item.get("status") or "").lower()
        if status not in STAFF_STATUSES:
            _fail("Invalid staff attendance status.")
        rec = StaffAttendance.query.filter_by(staff_user_id=user.id, attendance_date=att_date).first()
        if not rec:
            rec = StaffAttendance(institution_id=tenant_id, staff_user_id=user.id, attendance_date=att_date)
            db.session.add(rec)
        rec.status = status.upper()
        if item.get("checkInTime") is not None:
            rec.check_in_time = _time(item.get("checkInTime"))
        if item.get("checkOutTime") is not None:
            rec.check_out_time = _time(item.get("checkOutTime"))
        if rec.check_in_time and rec.check_out_time and rec.check_out_time < rec.check_in_time:
            _fail("Check-out time cannot be before check-in time.")
        if "remarks" in item:
            rec.remarks = (str(item["remarks"]).strip()[:500] or None) if item["remarks"] else None
        rec.recorded_by = g.user_id
        saved.append(rec)

    db.session.commit()
    return jsonify({"success": True, "data": _serialize_staff(saved)}), 200


@attendance_bp.route("/staff/<uuid:record_id>/correct", methods=["POST"])
@role_required(*ADMIN)
def correct_staff_attendance(record_id):
    rec = db.session.get(StaffAttendance, record_id)
    if not rec:
        _fail("Attendance record not found.", 404, "NOT_FOUND")
    ensure_same_tenant(rec.institution_id)

    data = request.get_json(silent=True) or {}
    status = str(data.get("status") or "").lower()
    if status not in STAFF_STATUSES:
        _fail("Invalid staff attendance status.")
    reason = str(data.get("reason") or "").strip()
    if len(reason) < 5:
        _fail("A correction reason of at least 5 characters is required.")

    db.session.add(AttendanceAuditCorrection(
        attendance_id=rec.id, attendance_type="STAFF", previous_status=rec.status,
        corrected_status=status.upper(), correction_reason=reason[:1000], corrected_by=g.user_id,
    ))
    rec.status = status.upper()
    if "remarks" in data:
        rec.remarks = (str(data["remarks"]).strip()[:500] or None) if data["remarks"] else None
    rec.recorded_by = g.user_id
    db.session.commit()
    return jsonify({"success": True, "data": _serialize_staff([rec])[0]}), 200
