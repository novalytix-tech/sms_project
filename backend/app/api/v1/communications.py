import uuid
from datetime import date, datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from app.extensions import db
from app.models import Notice, Message, CommunicationGroup, GroupMember, GroupMessage, User
from app.utils.tenant import get_current_tenant_id
from app.utils.errors import APIException
from app.services.sms_service import sms_service
from app.services.email_service import email_service

communications_bp = Blueprint("communications", __name__, url_prefix="/communications")


# -------------------------------------------------------------
# 0. Credential delivery (SMS / Email) — works without the database
# -------------------------------------------------------------

@communications_bp.route("/send-credentials", methods=["POST"])
def send_credentials():
    """Deliver a new user's Login ID + temporary password over SMS and/or Email.

    Body: { name, role, login_id, temporary_password, phone?, email?, channels? }
    `channels` is a list like ["sms", "email"]; defaults to whatever contact info is present.
    Returns the real send result per channel so the UI can report success or failure honestly.
    """
    payload = request.get_json(silent=True) or {}

    name = (payload.get("name") or payload.get("person_name") or "User").strip()
    role = (payload.get("role") or "user").strip()
    login_id = (payload.get("login_id") or payload.get("loginId") or "").strip()
    temporary_password = (
        payload.get("temporary_password") or payload.get("temporaryPassword") or ""
    ).strip()
    phone = (payload.get("phone") or "").strip()
    email = (payload.get("email") or "").strip()

    if not login_id or not temporary_password:
        raise APIException(
            "login_id and temporary_password are required",
            status_code=400,
            error_code="CREDENTIALS_REQUIRED",
        )

    channels = payload.get("channels")
    if not channels:
        channels = []
        if phone:
            channels.append("sms")
        if email:
            channels.append("email")

    results = {}

    if "sms" in channels:
        if not phone:
            results["sms"] = {"sent": False, "detail": "No phone number on record."}
        else:
            results["sms"] = sms_service.send_credentials(
                phone=phone,
                person_name=name,
                login_id=login_id,
                temporary_password=temporary_password,
                role=role,
            )

    if "email" in channels:
        if not email:
            results["email"] = {"sent": False, "detail": "No email on record."}
        else:
            subject = "Your School ERP Login Credentials"
            text_body = (
                f"Hello {name},\n\nYour {role} account has been created.\n"
                f"Login ID: {login_id}\nTemporary Password: {temporary_password}\n\n"
                "Please log in and change your password immediately.\n"
            )
            html_body = (
                f"<p>Hello <strong>{name}</strong>,</p>"
                f"<p>Your {role} account has been created.</p>"
                f"<p><strong>Login ID:</strong> {login_id}<br>"
                f"<strong>Temporary Password:</strong> {temporary_password}</p>"
                "<p>Please log in and change your password immediately.</p>"
            )
            sent = email_service._send_email(email, subject, html_body, text_body)
            results["email"] = {
                "sent": bool(sent),
                "detail": "Email dispatched." if sent else "Email saved to outbox (SMTP not configured).",
            }

    any_sent = any(r.get("sent") for r in results.values())
    return jsonify({
        "success": any_sent,
        "data": {"results": results},
        "message": "Credentials dispatched." if any_sent
                   else "No channel delivered. Check SMS/SMTP configuration.",
    }), (200 if any_sent else 502)


# -------------------------------------------------------------
# 1. Notices / Announcements
# -------------------------------------------------------------

@communications_bp.route("/notices", methods=["GET"])
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
def create_notice():
    institution_id = get_current_tenant_id(required=True)
    payload = request.get_json() or {}

    title = payload.get("title")
    content = payload.get("content")
    if not title or not content:
        raise APIException("title and content are required", status_code=400)

    author_id = get_jwt_identity()
    if not author_id:
        u = User.query.filter_by(is_active=True).first()
        author_id = str(u.id) if u else None

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
def list_messages():
    institution_id = get_current_tenant_id()
    query = Message.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    user_id = request.args.get("user_id") or get_jwt_identity()
    if user_id:
        u_uuid = uuid.UUID(str(user_id))
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
def send_message():
    institution_id = get_current_tenant_id(required=True)
    payload = request.get_json() or {}

    recipient_id = payload.get("recipient_id")
    body = payload.get("body") or payload.get("content")

    if not recipient_id or not body:
        raise APIException("recipient_id and body are required", status_code=400)

    sender_id = get_jwt_identity()
    if not sender_id:
        u = User.query.filter_by(is_active=True).first()
        sender_id = str(u.id) if u else None

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

