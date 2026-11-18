import uuid
from datetime import date, time, datetime
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import (
    AcademicYear, Term, ClassLevel, Section, Subject, ClassSubject,
    TeacherAssignment, TimetablePeriod, TimetableSlot, CalendarEvent, User
)
from app.utils.tenant import get_current_tenant_id
from app.utils.errors import APIException

academics_bp = Blueprint("academics", __name__, url_prefix="/academics")


# -------------------------------------------------------------
# 1. Academic Sessions (Years) & Terms
# -------------------------------------------------------------

@academics_bp.route("/sessions", methods=["GET"])
def list_sessions():
    institution_id = get_current_tenant_id()
    query = AcademicYear.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    sessions = query.order_by(AcademicYear.start_date.desc()).all()
    data = [
        {
            "id": str(s.id),
            "name": s.name,
            "start_date": s.start_date.isoformat(),
            "end_date": s.end_date.isoformat(),
            "is_current": s.is_current,
            "terms": [
                {
                    "id": str(t.id),
                    "name": t.name,
                    "start_date": t.start_date.isoformat(),
                    "end_date": t.end_date.isoformat(),
                    "is_active": t.is_active,
                }
                for t in s.terms
            ]
        }
        for s in sessions
    ]
    return jsonify({"success": True, "data": data}), 200


@academics_bp.route("/sessions", methods=["POST"])
def create_session():
    institution_id = get_current_tenant_id(required=True)
    payload = request.get_json() or {}

    name = payload.get("name")
    start_date = payload.get("start_date") or payload.get("startDate")
    end_date = payload.get("end_date") or payload.get("endDate")
    is_current = payload.get("is_current", False)

    if not name or not start_date or not end_date:
        raise APIException("name, start_date, and end_date are required", status_code=400)

    s_date = datetime.strptime(str(start_date)[:10], "%Y-%m-%d").date()
    e_date = datetime.strptime(str(end_date)[:10], "%Y-%m-%d").date()

    if is_current:
        # Mark other sessions not current
        AcademicYear.query.filter_by(institution_id=institution_id).update({"is_current": False})

    session = AcademicYear(
        institution_id=institution_id,
        name=name.strip(),
        start_date=s_date,
        end_date=e_date,
        is_current=is_current,
    )
    db.session.add(session)
    db.session.commit()

    return jsonify({
        "success": True,
        "data": {
            "id": str(session.id),
            "name": session.name,
            "start_date": session.start_date.isoformat(),
            "end_date": session.end_date.isoformat(),
            "is_current": session.is_current,
        },
        "message": "Academic session created successfully."
    }), 201


# -------------------------------------------------------------
# 2. Classes & Sections
# -------------------------------------------------------------

@academics_bp.route("/classes", methods=["GET"])
def list_classes():
    institution_id = get_current_tenant_id()
    query = ClassLevel.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    classes = query.order_by(ClassLevel.sequence_order.asc(), ClassLevel.name.asc()).all()
    data = []
    for c in classes:
        sections_data = []
        for sec in c.sections:
            teacher_name = None
            if sec.class_teacher:
                teacher_name = f"{sec.class_teacher.first_name} {sec.class_teacher.last_name}".strip()

            sections_data.append({
                "id": str(sec.id),
                "name": sec.name,
                "capacity": sec.capacity,
                "room_id": str(sec.room_id) if sec.room_id else None,
                "class_teacher_id": str(sec.class_teacher_id) if sec.class_teacher_id else None,
                "class_teacher_name": teacher_name,
                "subjects_count": len(sec.class_subjects),
            })

        data.append({
            "id": str(c.id),
            "name": c.name,
            "code": c.code,
            "sequence_order": c.sequence_order,
            "sections": sections_data,
        })

    return jsonify({"success": True, "data": data}), 200


@academics_bp.route("/classes", methods=["POST"])
def create_class():
    institution_id = get_current_tenant_id(required=True)
    payload = request.get_json() or {}

    name = payload.get("name")
    code = payload.get("code") or name
    sequence = payload.get("sequence_order", 1)

    if not name:
        raise APIException("Class name is required", status_code=400)

    class_level = ClassLevel(
        institution_id=institution_id,
        name=name.strip(),
        code=code.strip().upper(),
        sequence_order=sequence,
    )
    db.session.add(class_level)
    db.session.flush()

    # Create default section A if specified
    sections = payload.get("sections") or ["A"]
    for sec_name in sections:
        sec = Section(
            class_level_id=class_level.id,
            name=str(sec_name).strip().upper(),
            capacity=payload.get("capacity", 40),
        )
        db.session.add(sec)

    db.session.commit()

    return jsonify({
        "success": True,
        "data": {
            "id": str(class_level.id),
            "name": class_level.name,
            "code": class_level.code,
            "sequence_order": class_level.sequence_order,
        },
        "message": "Class created successfully."
    }), 201


@academics_bp.route("/sections/<uuid:section_id>", methods=["GET"])
def get_section(section_id):
    sec = Section.query.filter_by(id=section_id).first()
    if not sec:
        raise APIException("Section not found", status_code=404)

    return jsonify({
        "success": True,
        "data": {
            "id": str(sec.id),
            "name": sec.name,
            "class_level_id": str(sec.class_level_id),
            "class_name": sec.class_level.name if sec.class_level else None,
            "capacity": sec.capacity,
            "subjects": [
                {
                    "class_subject_id": str(cs.id),
                    "subject_id": str(cs.subject_id),
                    "subject_name": cs.subject.name if cs.subject else None,
                    "subject_code": cs.subject.code if cs.subject else None,
                    "is_elective": cs.is_elective,
                }
                for cs in sec.class_subjects
            ]
        }
    }), 200


# -------------------------------------------------------------
# 3. Subjects
# -------------------------------------------------------------

@academics_bp.route("/subjects", methods=["GET"])
def list_subjects():
    institution_id = get_current_tenant_id()
    query = Subject.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    subjects = query.order_by(Subject.name.asc()).all()
    data = [
        {
            "id": str(s.id),
            "code": s.code,
            "name": s.name,
            "subject_type": s.subject_type,
            "credit_hours": float(s.credit_hours),
        }
        for s in subjects
    ]
    return jsonify({"success": True, "data": data}), 200


@academics_bp.route("/subjects", methods=["POST"])
def create_subject():
    institution_id = get_current_tenant_id(required=True)
    payload = request.get_json() or {}

    name = payload.get("name")
    code = payload.get("code")

    if not name or not code:
        raise APIException("Subject name and code are required", status_code=400)

    exists = Subject.query.filter_by(institution_id=institution_id, code=code.strip().upper()).first()
    if exists:
        raise APIException(f"Subject code '{code}' already exists", status_code=409)

    subject = Subject(
        institution_id=institution_id,
        code=code.strip().upper(),
        name=name.strip(),
        subject_type=payload.get("subject_type", "THEORY").upper(),
        credit_hours=payload.get("credit_hours", 1.0),
    )
    db.session.add(subject)
    db.session.commit()

    return jsonify({
        "success": True,
        "data": {
            "id": str(subject.id),
            "code": subject.code,
            "name": subject.name,
            "subject_type": subject.subject_type,
            "credit_hours": float(subject.credit_hours),
        },
        "message": "Subject created successfully."
    }), 201


# -------------------------------------------------------------
# 4. Timetable & Schedule Slots
# -------------------------------------------------------------

@academics_bp.route("/timetable", methods=["GET"])
def get_timetable():
    institution_id = get_current_tenant_id()
    section_id = request.args.get("section_id")

    query = TimetableSlot.query
    if section_id:
        query = query.filter_by(section_id=uuid.UUID(section_id))
    elif institution_id:
        # Join to section to filter by tenant
        query = query.join(Section).join(ClassLevel).filter(ClassLevel.institution_id == institution_id)

    slots = query.all()
    data = []
    for s in slots:
        teacher_name = None
        if s.teacher:
            teacher_name = f"{s.teacher.first_name} {s.teacher.last_name}".strip()

        data.append({
            "id": str(s.id),
            "section_id": str(s.section_id),
            "section_name": s.section.name if s.section else None,
            "class_name": s.section.class_level.name if s.section and s.section.class_level else None,
            "period_id": str(s.period_id),
            "period_number": s.period.period_number if s.period else None,
            "start_time": s.period.start_time.strftime("%H:%M") if s.period else None,
            "end_time": s.period.end_time.strftime("%H:%M") if s.period else None,
            "day_of_week": s.day_of_week,
            "subject_id": str(s.subject_id),
            "subject_name": s.subject.name if s.subject else None,
            "teacher_id": str(s.teacher_id) if s.teacher_id else None,
            "teacher_name": teacher_name,
            "room_id": str(s.room_id) if s.room_id else None,
            "room_number": s.room.room_number if s.room else None,
        })

    return jsonify({"success": True, "data": data}), 200

