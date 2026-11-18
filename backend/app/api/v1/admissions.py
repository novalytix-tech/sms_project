import uuid
from datetime import date, datetime
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import (
    AdmissionInquiry, AdmissionApplication, ApplicationDocument,
    ApplicationEvaluation, Student, User, AcademicYear, ClassLevel
)
from app.utils.tenant import get_current_tenant_id
from app.utils.errors import APIException

admissions_bp = Blueprint("admissions", __name__, url_prefix="/admissions")


# -------------------------------------------------------------
# 1. Inquiries
# -------------------------------------------------------------

@admissions_bp.route("/inquiries", methods=["GET"])
def list_inquiries():
    institution_id = get_current_tenant_id()
    query = AdmissionInquiry.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    status = request.args.get("status")
    if status:
        query = query.filter_by(status=status.upper())

    inquiries = query.order_by(AdmissionInquiry.inquiry_date.desc()).all()
    data = [
        {
            "id": str(i.id),
            "applicant_name": i.applicant_name,
            "parent_name": i.parent_name,
            "target_class_level_id": str(i.target_class_level_id),
            "target_class_name": i.target_class.name if i.target_class else None,
            "inquiry_date": i.inquiry_date.isoformat(),
            "email": i.email,
            "phone": i.phone,
            "source": i.source,
            "status": i.status,
            "notes": i.notes,
            "applicant_dob": i.applicant_dob.isoformat() if i.applicant_dob else None,
            "gender": i.gender,
            "previous_school": i.previous_school,
            "previous_class": i.previous_class,
            "previous_board": i.previous_board,
            "interested_class_name": i.interested_class_name or (i.target_class.name if i.target_class else None),
            "address": i.address,
            "alternate_phone": i.alternate_phone,
            "relationship_to_applicant": i.relationship_to_applicant,
        }
        for i in inquiries
    ]
    return jsonify({"success": True, "data": data}), 200


@admissions_bp.route("/inquiries", methods=["POST"])
def create_inquiry():
    institution_id = get_current_tenant_id(required=True)
    payload = request.get_json() or {}

    first_name = payload.get("first_name") or payload.get("firstName") or "Applicant"
    last_name = payload.get("last_name") or payload.get("lastName") or ""
    phone = payload.get("phone_number") or payload.get("phone")
    parent_name = payload.get("parent_name") or f"{first_name}'s Parent"
    applicant_name = payload.get("applicant_name") or f"{first_name} {last_name}".strip()

    if not phone:
        raise APIException("phone is required", status_code=400)

    class_id = payload.get("target_class_level_id") or payload.get("class_level_id")
    class_obj = None
    if class_id:
        class_obj = ClassLevel.query.filter_by(id=uuid.UUID(str(class_id))).first()
    if not class_obj:
        class_obj = ClassLevel.query.filter_by(institution_id=institution_id).first()
    if not class_obj:
        class_obj = ClassLevel(institution_id=institution_id, name="Grade 1", code="G1", sequence_order=1)
        db.session.add(class_obj)
        db.session.flush()

    # Parse optional date of birth (accepts YYYY-MM-DD)
    dob_val = None
    dob_raw = payload.get("applicant_dob") or payload.get("dob")
    if dob_raw:
        try:
            dob_val = datetime.strptime(str(dob_raw)[:10], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            dob_val = None

    inquiry = AdmissionInquiry(
        institution_id=institution_id,
        parent_name=parent_name,
        applicant_name=applicant_name,
        target_class_level_id=class_obj.id,
        email=payload.get("email"),
        phone=phone.strip(),
        inquiry_date=date.today(),
        source=payload.get("source", "WEBSITE"),
        status="NEW",
        notes=payload.get("notes"),
        applicant_dob=dob_val,
        gender=payload.get("gender"),
        previous_school=payload.get("previous_school") or payload.get("previousSchool"),
        previous_class=payload.get("previous_class") or payload.get("previousClass"),
        previous_board=payload.get("previous_board") or payload.get("previousBoard"),
        interested_class_name=payload.get("interested_class_name") or payload.get("interestedClassName"),
        address=payload.get("address"),
        alternate_phone=payload.get("alternate_phone") or payload.get("alternateMobile"),
        relationship_to_applicant=payload.get("relationship") or payload.get("relationship_to_applicant"),
    )
    db.session.add(inquiry)
    db.session.commit()

    return jsonify({
        "success": True,
        "data": {
            "id": str(inquiry.id),
            "applicant_name": inquiry.applicant_name,
            "status": inquiry.status,
        },
        "message": "Inquiry recorded successfully."
    }), 201


# -------------------------------------------------------------
# 2. Applications
# -------------------------------------------------------------

@admissions_bp.route("/applications", methods=["GET"])
def list_applications():
    institution_id = get_current_tenant_id()
    query = AdmissionApplication.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    status = request.args.get("status")
    if status:
        query = query.filter_by(status=status.upper())

    apps = query.order_by(AdmissionApplication.submission_date.desc()).all()
    data = [
        {
            "id": str(a.id),
            "application_number": a.application_number,
            "submission_date": a.submission_date.isoformat(),
            "applicant_first_name": a.applicant_first_name,
            "applicant_last_name": a.applicant_last_name,
            "full_name": f"{a.applicant_first_name} {a.applicant_last_name}".strip(),
            "date_of_birth": a.date_of_birth.isoformat(),
            "gender": a.gender,
            "status": a.status,
            "target_class_level_id": str(a.target_class_level_id),
            "target_class_name": a.target_class.name if a.target_class else None,
            "target_academic_year_id": str(a.target_academic_year_id),
            "target_academic_year_name": a.target_year.name if a.target_year else None,
        }
        for a in apps
    ]
    return jsonify({"success": True, "data": data}), 200


@admissions_bp.route("/applications", methods=["POST"])
def submit_application():
    institution_id = get_current_tenant_id(required=True)
    payload = request.get_json() or {}

    first_name = payload.get("applicant_first_name") or payload.get("first_name") or payload.get("firstName")
    last_name = payload.get("applicant_last_name") or payload.get("last_name") or payload.get("lastName") or ""

    if not first_name:
        raise APIException("applicant_first_name is required", status_code=400)

    # Resolve academic year
    ay = AcademicYear.query.filter_by(institution_id=institution_id, is_current=True).first()
    if not ay:
        ay = AcademicYear.query.filter_by(institution_id=institution_id).first()
    if not ay:
        raise APIException("No academic year found for institution", status_code=400)

    # Resolve target class
    class_id = payload.get("target_class_level_id") or payload.get("class_applied_id") or payload.get("classId")
    class_obj = None
    if class_id:
        class_obj = ClassLevel.query.filter_by(id=uuid.UUID(str(class_id))).first()
    if not class_obj:
        class_obj = ClassLevel.query.filter_by(institution_id=institution_id).first()

    dob = payload.get("date_of_birth") or payload.get("dob")
    dob_val = datetime.strptime(str(dob)[:10], "%Y-%m-%d").date() if dob else date(2012, 1, 1)

    app_no = f"APP-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    app = AdmissionApplication(
        institution_id=institution_id,
        target_academic_year_id=ay.id,
        target_class_level_id=class_obj.id,
        application_number=app_no,
        applicant_first_name=first_name.strip(),
        applicant_last_name=last_name.strip(),
        date_of_birth=dob_val,
        gender=payload.get("gender", "OTHER").upper(),
        submission_date=date.today(),
        status="SUBMITTED",
    )
    db.session.add(app)
    db.session.commit()

    return jsonify({
        "success": True,
        "data": {
            "id": str(app.id),
            "application_number": app.application_number,
            "status": app.status,
        },
        "message": f"Application {app.application_number} submitted successfully."
    }), 201


@admissions_bp.route("/applications/<uuid:application_id>/status", methods=["PUT"])
def update_application_status(application_id):
    institution_id = get_current_tenant_id()
    app = AdmissionApplication.query.filter_by(id=application_id).first()
    if not app:
        raise APIException("Application not found", status_code=404)

    payload = request.get_json() or {}
    new_status = payload.get("status", "").upper()
    valid_statuses = {"SUBMITTED", "UNDER_REVIEW", "ASSESSMENT_SCHEDULED", "OFFERED", "ENROLLED", "REJECTED"}
    if new_status not in valid_statuses:
        raise APIException(f"Invalid status. Must be one of: {', '.join(valid_statuses)}", status_code=400)

    app.status = new_status
    db.session.commit()

    return jsonify({
        "success": True,
        "data": {
            "id": str(app.id),
            "status": app.status,
        },
        "message": f"Application status updated to {new_status}."
    }), 200
