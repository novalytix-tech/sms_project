import uuid
from typing import Optional
from flask import request
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from app.models.institution import Institution


def get_current_tenant_id(required: bool = False) -> Optional[uuid.UUID]:
    """
    Resolve tenant institution UUID from:
    1. Authenticated JWT claims ('institution_id')
    2. 'X-Institution-Id' HTTP header
    3. 'institution_id' request query argument
    4. Default primary active institution in the database (fallback for local dev/demo)
    """
    # 1. Try JWT
    try:
        verify_jwt_in_request(optional=True)
        claims = get_jwt()
        if claims and claims.get("institution_id"):
            val = claims.get("institution_id")
            if val:
                return uuid.UUID(str(val))
    except Exception:
        pass

    # 2. Try Header or Query parameter
    raw_id = request.headers.get("X-Institution-Id") or request.args.get("institution_id")
    if raw_id:
        try:
            return uuid.UUID(str(raw_id))
        except (ValueError, TypeError):
            # Try finding by code
            inst = Institution.query.filter_by(code=str(raw_id).upper()).first()
            if inst:
                return inst.id

    # 3. Default fallback: primary active institution
    primary_inst = Institution.query.filter_by(status="ACTIVE").first()
    if primary_inst:
        return primary_inst.id

    if required:
        from app.utils.errors import APIException
        raise APIException("Active institution context required", status_code=400, error_code="TENANT_REQUIRED")

    return None

