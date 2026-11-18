import uuid
from datetime import date, datetime
from decimal import Decimal
from flask import g, Blueprint, request, jsonify
from app.auth import ANY_MEMBER, STAFF, role_required
from app.utils.tenant import ensure_same_tenant
from app.extensions import db
from app.models import Exam, ExamSchedule, ExamResult, GradingScale, AcademicYear, Section, Subject, Student, StudentEnrollment
from app.utils.tenant import get_current_tenant_id
from app.utils.errors import APIException

examinations_bp = Blueprint("examinations", __name__, url_prefix="/examinations")


@examinations_bp.route("/exams", methods=["GET"])
@role_required(*ANY_MEMBER)
def list_exams():
    institution_id = get_current_tenant_id()
    query = Exam.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    exams = query.order_by(Exam.start_date.desc()).all()
    data = [
        {
            "id": str(e.id),
            "name": e.name,
            "exam_type": e.exam_type,
            "academic_year_id": str(e.academic_year_id),
            "academic_year_name": e.academic_year.name if e.academic_year else None,
            "start_date": e.start_date.isoformat(),
            "end_date": e.end_date.isoformat(),
            "status": e.status,
            "schedules": [
                {
                    "id": str(s.id),
                    "class_level_id": str(s.class_level_id),
                    "class_name": s.class_level.name if s.class_level else None,
                    "subject_id": str(s.subject_id),
                    "subject_name": s.subject.name if s.subject else None,
                    "exam_date": s.exam_date.isoformat(),
                    "start_time": s.start_time.strftime("%H:%M"),
                    "end_time": s.end_time.strftime("%H:%M"),
                    "max_marks": float(s.max_marks),
                    "passing_marks": float(s.passing_marks),
                }
                for s in e.schedules
            ]
        }
        for e in exams
    ]
    return jsonify({"success": True, "data": data}), 200


@examinations_bp.route("/results", methods=["GET"])
@role_required(*STAFF)
def list_results():
    exam_id = request.args.get("exam_id")
    student_id = request.args.get("student_id")

    query = ExamResult.query
    if exam_id:
        query = query.join(ExamSchedule, ExamResult.exam_schedule_id == ExamSchedule.id).filter(ExamSchedule.exam_id == uuid.UUID(exam_id))
    if student_id:
        query = query.join(StudentEnrollment, ExamResult.enrollment_id == StudentEnrollment.id).filter(StudentEnrollment.student_id == uuid.UUID(student_id))

    results = query.all()
    data = [
        {
            "id": str(r.id),
            "student_id": str(r.enrollment.student_id) if r.enrollment else None,
            "student_name": f"{r.enrollment.student.user.first_name} {r.enrollment.student.user.last_name}".strip() if r.enrollment and r.enrollment.student and r.enrollment.student.user else "Student",
            "admission_number": r.enrollment.student.admission_number if r.enrollment and r.enrollment.student else None,
            "subject_name": r.exam_schedule.subject.name if r.exam_schedule and r.exam_schedule.subject else None,
            "marks_obtained": float(r.marks_obtained) if r.marks_obtained is not None else None,
            "max_marks": float(r.exam_schedule.max_marks) if r.exam_schedule else 100.0,
            "grade": r.grade,
            "remarks": r.remarks,
        }
        for r in results
    ]
    return jsonify({"success": True, "data": data}), 200


@examinations_bp.route("/grading-scales", methods=["GET"])
@role_required(*ANY_MEMBER)
def list_grading_scales():
    institution_id = get_current_tenant_id()
    query = GradingScale.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    scales = query.order_by(GradingScale.grade_point.desc()).all()
    data = [
        {
            "id": str(s.id),
            "name": s.name,
            "grade": s.grade,
            "grade_point": float(s.grade_point),
            "min_percentage": float(s.min_percentage),
            "max_percentage": float(s.max_percentage),
            "description": s.description,
        }
        for s in scales
    ]
    return jsonify({"success": True, "data": data}), 200

