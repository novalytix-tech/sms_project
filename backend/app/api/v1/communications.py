import uuid
from datetime import date, datetime, timezone
from flask import g, Blueprint, request, jsonify
from app.auth import ANY_MEMBER, STAFF, role_required
from app.utils.tenant import ensure_same_tenant
from app.extensions import db
from app.models import Notice, Message, CommunicationGroup, GroupMember, GroupMessage, User
from app.utils.tenant import get_current_tenant_id
from app.utils.errors import APIException

communications_bp = Blueprint("communications", __name__, url_prefix="/communications")


# -------------------------------------------------------------
@communications_bp.route("/notices", methods=["GET"])
@role_required(*ANY_MEMBER)
def list_notices():
    institution_id = get_current_tenant_id()
    query = Notice.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    target = request.args.get("target")
    if target:
        query = query.filter((Notice.target_audience == target.upper()) | (Notice.target_audience == "ALL"))

    notices = query.order_by(Notice.publish_date.desc()).all()
    data = [
        {
            "id": str(n.id),
            "title": n.title,
            "content": n.content,
            "priority": n.priority,
            "target_audience": n.target_audience,
            "publish_date": n.publish_date.isoformat(),
            "expiry_date": n.expiry_date.isoformat() if n.expiry_date else None,
            "attachment_url": n.attachment_url,
            "author_name": f"{n.author.first_name} {n.author.last_name}".strip() if n.author else "Admin",
        }
        for n in notices
    ]
    return jsonify({"success": True, "data": data}), 200


@communications_bp.route("/notices", methods=["POST"])
@role_required(*STAFF)
def create_notice():
    institution_id = get_current_tenant_id(required=True)
    payload = request.get_json() or {}

    title = payload.get("title")
    content = payload.get("content")
    if not title or not content:
        raise APIException("title and content are required", status_code=400)

    author_id = str(g.user_id)

    if not author_id:
        raise APIException("Author identity required", status_code=400)

    notice = Notice(
        institution_id=institution_id,
        author_user_id=uuid.UUID(str(author_id)),
        title=title.strip(),
        content=content.strip(),
        priority=payload.get("priority", "NORMAL").upper(),
        target_audience=payload.get("target_audience", "ALL").upper(),
        publish_date=date.today(),
        attachment_url=payload.get("attachment_url"),
    )
    db.session.add(notice)
    db.session.commit()

    return jsonify({
        "success": True,
        "data": {"id": str(notice.id), "title": notice.title},
        "message": "Notice published successfully."
    }), 201


# -------------------------------------------------------------
# 2. Messages (1-to-1)
# -------------------------------------------------------------

@communications_bp.route("/messages", methods=["GET"])
@role_required(*ANY_MEMBER)
def list_messages():
    institution_id = get_current_tenant_id()
    query = Message.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    # Users only ever see their own conversations.
    u_uuid = g.user_id
    query = query.filter((Message.sender_id == u_uuid) | (Message.recipient_id == u_uuid))

    messages = query.order_by(Message.sent_at.desc()).all()
    data = [
        {
            "id": str(m.id),
            "sender_id": str(m.sender_id),
            "sender_name": f"{m.sender.first_name} {m.sender.last_name}".strip() if m.sender else None,
            "recipient_id": str(m.recipient_id),
            "recipient_name": f"{m.recipient.first_name} {m.recipient.last_name}".strip() if m.recipient else None,
            "subject": m.subject,
            "body": m.body,
            "sent_at": m.sent_at.isoformat(),
            "is_read": m.is_read,
        }
        for m in messages
    ]
    return jsonify({"success": True, "data": data}), 200


@communications_bp.route("/messages", methods=["POST"])
@role_required(*ANY_MEMBER)
def send_message():
    institution_id = get_current_tenant_id(required=True)
    payload = request.get_json() or {}

    recipient_id = payload.get("recipient_id")
    body = payload.get("body") or payload.get("content")

    if not recipient_id or not body:
        raise APIException("recipient_id and body are required", status_code=400)
    recipient = db.session.get(User, uuid.UUID(str(recipient_id)))
    if not recipient or recipient.is_deleted:
        raise APIException("Recipient not found", status_code=404)
    ensure_same_tenant(recipient.institution_id)

    sender_id = str(g.user_id)

    if not sender_id:
        raise APIException("Sender identity required", status_code=400)

    msg = Message(
        institution_id=institution_id,
        sender_id=uuid.UUID(str(sender_id)),
        recipient_id=uuid.UUID(str(recipient_id)),
        subject=payload.get("subject"),
        body=body.strip(),
        sent_at=datetime.now(timezone.utc),
        is_read=False,
    )
    db.session.add(msg)
    db.session.commit()

    return jsonify({
        "success": True,
        "data": {"id": str(msg.id), "sent_at": msg.sent_at.isoformat()},
        "message": "Message delivered successfully."
    }), 201

