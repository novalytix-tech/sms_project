"""Examinations: exams per class-section, paper schedules, and marks.

Who may do what
  - school_admin: create/edit/delete exams and papers; enter marks for any section
  - teacher: see exams of sections they teach / are class teacher of; enter marks there
  - parent: read-only, exams and marks of linked children; student: read-only, own
"""
import re
import uuid
from datetime import datetime
from decimal import Decimal, InvalidOperation

from flask import Blueprint, g, jsonify, request
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from app.auth import ADMIN, ANY_MEMBER, STAFF, role_required
from app.extensions import db
from app.models import (
    AcademicYear, ClassSubject, Exam, ExamResult, ExamSchedule, GradingScale, Parent, Section,
    Student, StudentEnrollment, StudentParent, Subject, TeacherAssignment,
)
from app.utils.errors import APIException
from app.utils.tenant import ensure_same_tenant, get_current_tenant_id

examinations_bp = Blueprint("examinations", __name__, url_prefix="/examinations")

EXAM_TYPES = {"Unit Test", "Mid-Term", "Final Exam", "Quarterly", "Practical"}
STATUS_TO_DB = {"upcoming": "SCHEDULED", "ongoing": "ONGOING", "completed": "COMPLETED"}
STATUS_FROM_DB = {v: k for k, v in STATUS_TO_DB.items()}
VIEWERS = ("school_admin", "teacher", "parent", "student")
MAX_MARKS_LIMIT = Decimal("1000")


def _fail(message, status=422, code="VALIDATION_ERROR"):
    raise APIException(message, status_code=status, error_code=code)


def _uuid(value, field):
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError):
        _fail(f"Invalid {field}.")


def _date(value, field):
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except (TypeError, ValueError):
        _fail(f"{field} must be a date (YYYY-MM-DD).")


def _time(value, field):
    try:
        return datetime.strptime(str(value)[:5], "%H:%M").time()
    except (TypeError, ValueError):
        _fail(f"{field} must be a time (HH:MM).")


def _number(value, field, maximum=MAX_MARKS_LIMIT):
    try:
        n = Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError, ValueError):
        _fail(f"{field} must be a number.")
    if n < 0 or n > maximum:
        _fail(f"{field} is out of range.")
    return n


def _text(value, n):
    return (str(value).strip()[:n] or None) if value not in (None, "") else None


# ------------------------------------------------------------- access

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
    if "parent" in g.roles:
        parent = Parent.query.filter_by(user_id=g.user_id).first()
        return {sp.student_id for sp in StudentParent.query.filter_by(parent_id=parent.id)} if parent else set()
    if "student" in g.roles:
        return {s.id for s in Student.query.filter_by(user_id=g.user_id)}
    return set()


def _visible_section_ids():
    """None = all sections of the school (admin)."""
    if _is_admin():
        return None
    if "teacher" in g.roles:
        return _teacher_section_ids()
    students = _visible_student_ids()
    return {
        e.section_id
        for e in StudentEnrollment.query.filter(StudentEnrollment.student_id.in_(students or [uuid.uuid4()]))
    }


def _exam_query():
    query = Exam.query.options(
        selectinload(Exam.schedules).selectinload(ExamSchedule.subject),
        selectinload(Exam.section).selectinload(Section.class_level),
        selectinload(Exam.academic_year),
    ).filter(Exam.is_deleted.is_(False), Exam.section_id.isnot(None))
    tenant_id = get_current_tenant_id()
    if tenant_id:
        query = query.filter(Exam.institution_id == tenant_id)
    sections = _visible_section_ids()
    if sections is not None:
        query = query.filter(Exam.section_id.in_(sections or [uuid.uuid4()]))
    return query


def _get_exam(exam_id):
    exam = _exam_query().filter(Exam.id == exam_id).first()
    if not exam:
        _fail("Exam not found.", 404, "NOT_FOUND")
    return exam


def _section_in_school(section_id):
    section = Section.query.options(selectinload(Section.class_level)).filter(Section.id == section_id).first()
    if not section or not section.class_level:
        _fail("Class section not found.", 404, "NOT_FOUND")
    ensure_same_tenant(section.class_level.institution_id)
    return section


# ------------------------------------------------------------- serializers

def _schedule_json(s):
    return {
        "id": str(s.id),
        "examId": str(s.exam_id),
        "subject": s.subject.name if s.subject else "",
        "date": s.exam_date.isoformat(),
        "startTime": s.start_time.strftime("%H:%M"),
        "endTime": s.end_time.strftime("%H:%M"),
        "maxMarks": float(s.max_marks),
        "passMarks": float(s.passing_marks),
        "roomNo": s.room_label or "",
    }


def _exam_json(e):
    sec = e.section
    return {
        "id": str(e.id),
        "title": e.name,
        "examType": e.exam_type,
        "classId": str(e.section_id),
        "className": sec.class_level.name if sec and sec.class_level else "",
        "section": sec.name if sec else "",
        "academicYear": e.academic_year.name if e.academic_year else "",
        "startDate": e.start_date.isoformat(),
        "endDate": e.end_date.isoformat(),
        "status": STATUS_FROM_DB.get(e.status, "upcoming"),
        "schedules": [_schedule_json(s) for s in sorted(e.schedules, key=lambda x: (x.exam_date, x.start_time))],
        "institutionId": str(e.institution_id),
    }


def _mark_json(r, exam_id, student_id):
    return {
        "id": str(r.id),
        "examId": str(exam_id),
        "scheduleId": str(r.exam_schedule_id),
        "studentId": str(student_id),
        "marksObtained": float(r.marks_obtained),
        "isAbsent": r.is_absent,
        "remarks": r.remarks,
    }


def _apply_exam_fields(exam, data, tenant_id, partial=False):
    if not partial or "title" in data:
        title = _text(data.get("title"), 100)
        if not title:
            _fail("title is required.")
        exam.name = title
    if not partial or "examType" in data:
        exam_type = data.get("examType") or "Mid-Term"
        if exam_type not in EXAM_TYPES:
            _fail("Invalid exam type.")
        exam.exam_type = exam_type
    if not partial or "classId" in data:
        exam.section_id = _section_in_school(_uuid(data.get("classId"), "classId")).id
    if not partial or "academicYear" in data:
        year = None
        if data.get("academicYear"):
            year = AcademicYear.query.filter_by(institution_id=tenant_id, name=str(data["academicYear"])[:50]).first()
        year = year or AcademicYear.query.filter_by(institution_id=tenant_id, is_current=True).first()
        if not year:
            _fail("Academic year not found in this school.", 404, "NOT_FOUND")
        exam.academic_year_id = year.id
    if not partial or "startDate" in data:
        exam.start_date = _date(data.get("startDate"), "startDate")
    if not partial or "endDate" in data:
        exam.end_date = _date(data.get("endDate"), "endDate")
    if exam.start_date > exam.end_date:
        _fail("End date cannot be before start date.")
    if not partial or "status" in data:
        status = data.get("status") or "upcoming"
        if status not in STATUS_TO_DB:
            _fail("Invalid status.")
        exam.status = STATUS_TO_DB[status]


# ------------------------------------------------------------- exams

@examinations_bp.route("/exams", methods=["GET"])
@role_required(*VIEWERS)
def list_exams():
    exams = _exam_query().order_by(Exam.start_date.desc()).limit(2000).all()
    return jsonify({"success": True, "data": [_exam_json(e) for e in exams]}), 200


@examinations_bp.route("/exams", methods=["POST"])
@role_required(*ADMIN)
def create_exam():
    tenant_id = get_current_tenant_id(required=True)
    exam = Exam(institution_id=tenant_id)
    _apply_exam_fields(exam, request.get_json(silent=True) or {}, tenant_id)
    if Exam.query.filter_by(institution_id=tenant_id, academic_year_id=exam.academic_year_id,
                            section_id=exam.section_id, name=exam.name, is_deleted=False).first():
        _fail("An exam with this title already exists for this class.", 409, "CONFLICT")
    db.session.add(exam)
    db.session.commit()
    return jsonify({"success": True, "data": _exam_json(_get_exam(exam.id))}), 201


@examinations_bp.route("/exams/<uuid:exam_id>", methods=["PUT"])
@role_required(*ADMIN)
def update_exam(exam_id):
    exam = _get_exam(exam_id)
    _apply_exam_fields(exam, request.get_json(silent=True) or {}, exam.institution_id, partial=True)
    db.session.commit()
    return jsonify({"success": True, "data": _exam_json(_get_exam(exam.id))}), 200


@examinations_bp.route("/exams/<uuid:exam_id>", methods=["DELETE"])
@role_required(*ADMIN)
def delete_exam(exam_id):
    exam = _get_exam(exam_id)
    has_marks = (
        db.session.query(ExamResult.id)
        .join(ExamSchedule, ExamResult.exam_schedule_id == ExamSchedule.id)
        .filter(ExamSchedule.exam_id == exam.id)
        .first()
    )
    if has_marks:
        _fail("This exam already has marks recorded and cannot be deleted.", 409, "CONFLICT")
    db.session.delete(exam)
    db.session.commit()
    return jsonify({"success": True, "data": {"id": str(exam_id)}}), 200


@examinations_bp.route("/exams/<uuid:exam_id>/schedules", methods=["POST"])
@role_required(*ADMIN)
def add_schedule(exam_id):
    exam = _get_exam(exam_id)
    data = request.get_json(silent=True) or {}

    subject_name = _text(data.get("subject"), 100)
    if not subject_name:
        _fail("subject is required.")
    subject = Subject.query.filter(
        Subject.institution_id == exam.institution_id, func.lower(Subject.name) == subject_name.lower()
    ).first()
    if not subject:
        code = re.sub(r"[^A-Z0-9]", "", subject_name.upper())[:20] or "SUBJ"
        if Subject.query.filter_by(institution_id=exam.institution_id, code=code).first():
            code = f"{code[:14]}-{uuid.uuid4().hex[:4].upper()}"
        subject = Subject(institution_id=exam.institution_id, code=code, name=subject_name)
        db.session.add(subject)
        db.session.flush()

    paper_date = _date(data.get("date"), "date")
    if not exam.start_date <= paper_date <= exam.end_date:
        _fail("Paper date must fall within the exam's start and end dates.")
    start, end = _time(data.get("startTime"), "startTime"), _time(data.get("endTime"), "endTime")
    if start >= end:
        _fail("End time must be after start time.")
    max_marks = _number(data.get("maxMarks", 100), "maxMarks")
    pass_marks = _number(data.get("passMarks", 33), "passMarks")
    if max_marks <= 0 or pass_marks > max_marks:
        _fail("Pass marks must be between 0 and max marks.")

    class_level_id = exam.section.class_level_id
    if ExamSchedule.query.filter_by(exam_id=exam.id, class_level_id=class_level_id, subject_id=subject.id).first():
        _fail("This subject is already scheduled in this exam.", 409, "CONFLICT")
    schedule = ExamSchedule(
        exam_id=exam.id, class_level_id=class_level_id, subject_id=subject.id,
        exam_date=paper_date, start_time=start, end_time=end,
        max_marks=max_marks, passing_marks=pass_marks, room_label=_text(data.get("roomNo"), 50),
    )
    db.session.add(schedule)
    db.session.commit()
    return jsonify({"success": True, "data": _exam_json(_get_exam(exam.id))}), 201


# ------------------------------------------------------------- marks

@examinations_bp.route("/marks", methods=["GET"])
@role_required(*VIEWERS)
def list_marks():
    exam_ids = _exam_query().with_entities(Exam.id)
    query = (
        db.session.query(ExamResult, ExamSchedule.exam_id, StudentEnrollment.student_id)
        .join(ExamSchedule, ExamResult.exam_schedule_id == ExamSchedule.id)
        .join(StudentEnrollment, ExamResult.enrollment_id == StudentEnrollment.id)
        .filter(ExamSchedule.exam_id.in_(exam_ids))
    )
    if not (_is_admin() or "teacher" in g.roles):
        query = query.filter(StudentEnrollment.student_id.in_(_visible_student_ids() or [uuid.uuid4()]))
    if request.args.get("exam_id"):
        query = query.filter(ExamSchedule.exam_id == _uuid(request.args["exam_id"], "exam_id"))
    if request.args.get("student_id"):
        query = query.filter(StudentEnrollment.student_id == _uuid(request.args["student_id"], "student_id"))
    rows = query.limit(50000).all()
    return jsonify({"success": True, "data": [_mark_json(r, exam_id, sid) for r, exam_id, sid in rows]}), 200


@examinations_bp.route("/marks/batch", methods=["POST"])
@role_required(*STAFF)
def save_marks():
    data = request.get_json(silent=True) or {}
    exam = _get_exam(_uuid(data.get("examId"), "examId"))  # teachers only reach their sections
    schedule = next((s for s in exam.schedules if s.id == _uuid(data.get("scheduleId"), "scheduleId")), None)
    if not schedule:
        _fail("Exam paper not found.", 404, "NOT_FOUND")

    items = data.get("records") or []
    if not isinstance(items, list) or not 1 <= len(items) <= 500:
        _fail("records must contain between 1 and 500 entries.")

    enrollments = {e.student_id: e for e in StudentEnrollment.query.filter_by(section_id=exam.section_id, status="ACTIVE")}
    existing = {r.enrollment_id: r for r in ExamResult.query.filter_by(exam_schedule_id=schedule.id)}

    for item in items:
        enrollment = enrollments.get(_uuid(item.get("studentId"), "studentId"))
        if not enrollment:
            _fail("A student in this list is not enrolled in the exam's class.")
        absent = bool(item.get("isAbsent"))
        marks = Decimal("0") if absent else _number(item.get("marksObtained", 0), "marksObtained", schedule.max_marks)
        rec = existing.get(enrollment.id)
        if not rec:
            rec = ExamResult(exam_schedule_id=schedule.id, enrollment_id=enrollment.id)
            db.session.add(rec)
        rec.marks_obtained = marks
        rec.is_absent = absent
        rec.remarks = _text(item.get("remarks"), 500)
        rec.evaluated_by = g.user_id

    db.session.commit()
    return jsonify({"success": True, "data": {"count": len(items)}}), 200


# ------------------------------------------------------------- grading scales

@examinations_bp.route("/grading-scales", methods=["GET"])
@role_required(*ANY_MEMBER)
def list_grading_scales():
    query = GradingScale.query
    tenant_id = get_current_tenant_id()
    if tenant_id:
        query = query.filter_by(institution_id=tenant_id)
    data = [
        {
            "id": str(s.id), "name": s.name, "grade": s.grade,
            "min_percentage": float(s.min_percentage), "max_percentage": float(s.max_percentage),
            "grade_point": float(s.grade_point), "description": s.description,
        }
        for s in query.order_by(GradingScale.min_percentage.desc()).all()
    ]
    return jsonify({"success": True, "data": data}), 200
