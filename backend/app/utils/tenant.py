import uuid
from typing import Optional

from flask import g, request

from app.utils.errors import APIException


def get_current_tenant_id(required: bool = False) -> Optional[uuid.UUID]:
    """Institution the current request is scoped to.

    School users are always scoped to their own institution; client-supplied
    headers or query params are ignored for them. Only super_admin may choose an
    institution via the ``X-Institution-Id`` header (None = all institutions).
    """
    tenant_id = getattr(g, "institution_id", None)

    if "super_admin" in getattr(g, "roles", set()):
        raw = request.headers.get("X-Institution-Id")
        if raw:
            try:
                tenant_id = uuid.UUID(raw)
            except ValueError:
                raise APIException("Invalid X-Institution-Id header.", status_code=400, error_code="BAD_TENANT")

    if tenant_id is None and required:
        raise APIException("An institution context is required.", status_code=400, error_code="TENANT_REQUIRED")
    return tenant_id


def ensure_same_tenant(record_institution_id) -> None:
    """Raise 404 (not 403, to avoid leaking existence) if a record belongs to another school."""
    tenant_id = get_current_tenant_id()
    if tenant_id is not None and record_institution_id != tenant_id:
        raise APIException("Resource not found.", status_code=404, error_code="NOT_FOUND")
