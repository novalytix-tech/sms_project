"""Authentication guard: every API route requires a valid Clerk session unless marked @public.

Identity comes from Clerk; authorization (roles, permissions, institution) comes from
our own database. A Clerk user is linked to a local ``users`` row the first time they
sign in, by matching their verified primary email to an account the school created.
Nobody can grant themselves access by signing up with Clerk.
"""
from datetime import datetime, timezone
from functools import wraps

from flask import current_app, g, request
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from app.auth.clerk import ClerkAuthError, get_verified_primary_email, verify_session_token
from app.extensions import db
from app.utils.errors import APIException


def public(fn):
    """Mark a view as reachable without authentication."""
    fn.is_public = True
    return fn


def _bearer_token() -> str:
    header = request.headers.get("Authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return ""


def _load_user(clerk_user_id: str):
    from app.models import User, UserRole, Role, RolePermission

    options = (
        selectinload(User.user_roles)
        .selectinload(UserRole.role)
        .selectinload(Role.role_permissions)
        .selectinload(RolePermission.permission)
    )
    user = User.query.options(options).filter_by(clerk_user_id=clerk_user_id).first()
    if user:
        return user

    # First sign-in: link to the school-provisioned account with the same verified email.
    email = get_verified_primary_email(clerk_user_id)
    if not email:
        return None
    user = (
        User.query.options(options)
        .filter(func.lower(User.email) == email, User.clerk_user_id.is_(None))
        .first()
    )
    if user:
        user.clerk_user_id = clerk_user_id
        user.is_verified = True
        db.session.commit()
    return user


def authenticate_request():
    """before_request hook for the API blueprint."""
    if request.method == "OPTIONS":
        return None
    view = current_app.view_functions.get(request.endpoint)
    if view is None or getattr(view, "is_public", False):
        return None

    try:
        claims = verify_session_token(_bearer_token())
    except ClerkAuthError as exc:
        raise APIException(str(exc), status_code=401, error_code="UNAUTHENTICATED")

    user = _load_user(claims["sub"])
    if user is None:
        raise APIException(
            "Your account has not been set up by the school yet. Contact your administrator.",
            status_code=403,
            error_code="ACCOUNT_NOT_PROVISIONED",
        )
    if not user.is_active or user.is_deleted:
        raise APIException("This account is deactivated.", status_code=403, error_code="ACCOUNT_DISABLED")

    g.current_user = user
    g.user_id = user.id
    g.roles = set(user.role_names)
    g.permissions = set(user.permissions)
    g.institution_id = user.institution_id

    now = datetime.now(timezone.utc)
    if not user.last_login_at or (now - user.last_login_at).total_seconds() > 3600:
        user.last_login_at = now
        db.session.commit()
    return None


def current_roles() -> set:
    return getattr(g, "roles", set())


def is_super_admin() -> bool:
    return "super_admin" in current_roles()


def role_required(*allowed_roles: str):
    """Require at least one of the roles. super_admin always passes."""
    allowed = set(allowed_roles)

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            roles = current_roles()
            if "super_admin" not in roles and not roles & allowed:
                raise APIException(
                    "You do not have permission to access this resource.",
                    status_code=403,
                    error_code="FORBIDDEN_ROLE",
                )
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def permission_required(*required: str, require_all: bool = False):
    needed = set(required)

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not is_super_admin():
                perms = getattr(g, "permissions", set())
                ok = needed.issubset(perms) if require_all else bool(needed & perms)
                if not ok:
                    raise APIException(
                        "You do not have permission to perform this action.",
                        status_code=403,
                        error_code="FORBIDDEN_PERMISSION",
                    )
            return fn(*args, **kwargs)
        return wrapper
    return decorator


# Role groups used across the API.
ADMIN = ("school_admin",)
STAFF = ("school_admin", "teacher")
ANY_MEMBER = ("school_admin", "teacher", "student", "parent", "supplier")
