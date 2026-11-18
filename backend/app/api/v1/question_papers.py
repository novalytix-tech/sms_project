import uuid
from datetime import datetime, timezone
from decimal import Decimal
from flask import g, Blueprint, request, jsonify
from app.auth import ADMIN, STAFF, role_required
from app.utils.tenant import ensure_same_tenant
from app.extensions import db
from app.models import QuestionPaper, QuestionPaperVersion, QuestionPaperReview, User, Subject, ClassLevel
from app.utils.tenant import get_current_tenant_id
from app.utils.errors import APIException

question_papers_bp = Blueprint("question_papers", __name__, url_prefix="/question-papers")


@question_papers_bp.route("", methods=["GET"])
@role_required(*STAFF)
def list_question_papers():
    institution_id = get_current_tenant_id()
    query = QuestionPaper.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    status = request.args.get("status")
    if status:
        query = query.filter_by(status=status.upper())

    papers = query.order_by(QuestionPaper.created_at.desc()).all()
    data = [
        {
            "id": str(p.id),
            "title": p.title,
            "paper_code": p.paper_code,
            "subject_id": str(p.subject_id),
            "subject_name": p.subject.name if p.subject else None,
            "class_level_id": str(p.class_level_id),
            "class_name": p.class_level.name if p.class_level else None,
            "author_teacher_id": str(p.author_teacher_id),
            "author_name": f"{p.author.first_name} {p.author.last_name}".strip() if p.author else None,
            "status": p.status,
            "total_marks": float(p.total_marks),
            "time_allowed_minutes": p.time_allowed_minutes,
            "versions_count": len(p.versions),
        }
        for p in papers
    ]
    return jsonify({"success": True, "data": data}), 200


@question_papers_bp.route("/<uuid:paper_id>", methods=["GET"])
@role_required(*STAFF)
def get_question_paper(paper_id):
    paper = QuestionPaper.query.filter_by(id=paper_id).first()
    if not paper:
        raise APIException("Question paper not found", status_code=404)
    ensure_same_tenant(paper.institution_id)

    return jsonify({
        "success": True,
        "data": {
            "id": str(paper.id),
            "title": paper.title,
            "paper_code": paper.paper_code,
            "status": paper.status,
            "total_marks": float(paper.total_marks),
            "time_allowed_minutes": paper.time_allowed_minutes,
            "versions": [
                {
                    "id": str(v.id),
                    "version_number": v.version_number,
                    "content_text": v.content_text,
                    "change_summary": v.change_summary,
                    "created_at": v.created_at.isoformat() if v.created_at else None,
                }
                for v in sorted(paper.versions, key=lambda x: x.version_number, reverse=True)
            ],
            "reviews": [
                {
                    "id": str(r.id),
                    "decision": r.review_decision,
                    "comments": r.comments,
                    "reviewed_at": r.review_date.isoformat() if r.review_date else None,
                }
                for r in paper.reviews
            ]
        }
    }), 200


@question_papers_bp.route("", methods=["POST"])
@role_required(*STAFF)
def create_question_paper():
    institution_id = get_current_tenant_id(required=True)
    payload = request.get_json() or {}

    title = payload.get("title")
    subject_id = payload.get("subject_id")
    class_level_id = payload.get("class_level_id")

    if not title or not subject_id or not class_level_id:
        raise APIException("title, subject_id, and class_level_id are required", status_code=400)

    author_id = str(g.user_id)

    paper_code = payload.get("paper_code") or f"QP-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

    paper = QuestionPaper(
        institution_id=institution_id,
        subject_id=uuid.UUID(str(subject_id)),
        class_level_id=uuid.UUID(str(class_level_id)),
        author_teacher_id=uuid.UUID(str(author_id)),
        title=title.strip(),
        paper_code=paper_code.strip(),
        status="DRAFT",
        total_marks=Decimal(str(payload.get("total_marks", 100.0))),
        time_allowed_minutes=payload.get("time_allowed_minutes", 180),
    )
    db.session.add(paper)
    db.session.flush()

    # Initial Version 1
    content_json = payload.get("content_json") or {"sections": [], "instructions": "Read all questions carefully."}
    v1 = QuestionPaperVersion(
        paper_id=paper.id,
        version_number=1,
        content_json=content_json,
        change_summary="Initial Draft creation",
        created_by=uuid.UUID(str(author_id)),
    )
    db.session.add(v1)
    db.session.commit()

    return jsonify({
        "success": True,
        "data": {"id": str(paper.id), "paper_code": paper.paper_code, "status": paper.status},
        "message": f"Question paper '{paper.title}' created."
    }), 201


@question_papers_bp.route("/<uuid:paper_id>/status", methods=["PUT"])
@role_required(*ADMIN)
def transition_question_paper_status(paper_id):
    paper = QuestionPaper.query.filter_by(id=paper_id).first()
    if not paper:
        raise APIException("Question paper not found", status_code=404)
    ensure_same_tenant(paper.institution_id)

    payload = request.get_json() or {}
    new_status = payload.get("status", "").upper()
    valid_statuses = {"DRAFT", "SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"}
    if new_status not in valid_statuses:
        raise APIException(f"Invalid status. Must be one of: {', '.join(valid_statuses)}", status_code=400)

    paper.status = new_status
    db.session.commit()

    return jsonify({
        "success": True,
        "data": {"id": str(paper.id), "status": paper.status},
        "message": f"Question paper transitioned to {new_status}."
    }), 200

