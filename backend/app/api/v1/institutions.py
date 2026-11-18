import uuid
from flask import g, Blueprint, request, jsonify
from app.auth import ADMIN, ANY_MEMBER, role_required
from app.utils.tenant import ensure_same_tenant
from app.extensions import db
from app.models import Institution, InstitutionSetting, ServiceEntitlement
from app.utils.tenant import get_current_tenant_id
from app.utils.errors import APIException

institutions_bp = Blueprint("institutions", __name__, url_prefix="/institutions")


@institutions_bp.route("/current", methods=["GET"])
@role_required(*ANY_MEMBER)
def get_current_institution():
    institution_id = get_current_tenant_id()
    inst = Institution.query.filter_by(id=institution_id).first()
    if not inst:
        inst = Institution.query.first()

    if not inst:
        raise APIException("No institution registered", status_code=404)

    entitlements = {e.service_key: e.is_enabled for e in inst.service_entitlements}
    settings = {s.setting_key: s.setting_value for s in inst.settings}

    return jsonify({
        "success": True,
        "data": {
            "id": str(inst.id),
            "code": inst.code,
            "name": inst.name,
            "board_affiliation": inst.board_affiliation,
            "affiliation_number": inst.affiliation_number,
            "email": inst.email,
            "phone": inst.phone,
            "address": inst.address,
            "city": inst.city,
            "state": inst.state,
            "country": inst.country,
            "currency": inst.currency,
            "logo_url": inst.logo_url,
            "status": inst.status,
            "entitlements": entitlements,
            "settings": settings,
        }
    }), 200


@institutions_bp.route("/current/settings", methods=["PUT"])
@role_required(*ADMIN)
def update_institution_settings():
    institution_id = get_current_tenant_id(required=True)
    inst = Institution.query.filter_by(id=institution_id).first()
    if not inst:
        raise APIException("Institution not found", status_code=404)

    payload = request.get_json() or {}
    for key, value in payload.items():
        setting = InstitutionSetting.query.filter_by(
            institution_id=institution_id,
            setting_key=str(key)
        ).first()

        if setting:
            setting.setting_value = str(value)
        else:
            setting = InstitutionSetting(
                institution_id=institution_id,
                setting_key=str(key),
                setting_value=str(value),
            )
            db.session.add(setting)

    db.session.commit()
    return jsonify({
        "success": True,
        "message": "Institution settings updated successfully."
    }), 200

