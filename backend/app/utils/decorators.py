import uuid
from functools import wraps
from typing import Optional, List, Union
from flask import jsonify, g, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from app.utils.errors import APIException
from app.models import StudentParent, Parent, ClassSubject, TeacherAssignment, User


def role_required(*allowed_roles: str):
    """
    Decorator requiring the authenticated user to possess at least one of the specified roles.
    Super administrators ('super_admin') bypass role restrictions for platform-wide oversight.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_roles = set(claims.get("roles", []))

            # super_admin has platform-wide override
            if "super_admin" in user_roles:
                return fn(*args, **kwargs)

            if not user_roles.intersection(set(allowed_roles)):
                raise APIException(
                    message="You do not have the required role to access this resource.",
                    status_code=403,
                    error_code="FORBIDDEN_ROLE",
                    details={"required_roles": list(allowed_roles), "user_roles": list(user_roles)}
                )
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def permission_required(*required_permissions: str, require_all: bool = False):
    """
    Decorator requiring the authenticated user to have specific granular permissions.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_roles = set(claims.get("roles", []))

            # super_admin bypass
            if "super_admin" in user_roles:
                return fn(*args, **kwargs)

            user_permissions = set(claims.get("permissions", []))
            req_set = set(required_permissions)

            if require_all:
                has_permission = req_set.issubset(user_permissions)
            else:
                has_permission = bool(user_permissions.intersection(req_set))

            if not has_permission:
                raise APIException(
                    message="You do not have the required permissions to perform this action.",
                    status_code=403,
                    error_code="FORBIDDEN_PERMISSION",
                    details={"required_permissions": list(required_permissions)}
                )
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def institution_required():
    """
    Decorator enforcing that the authenticated identity is bound to an active institution.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_roles = set(claims.get("roles", []))

            # Global super admin is exempt from specific institution binding
            if "super_admin" in user_roles:
                return fn(*args, **kwargs)

            institution_id = claims.get("institution_id")
            if not institution_id:
                raise APIException(
                    message="Action requires an active institution context.",
                    status_code=403,
                    error_code="INSTITUTION_REQUIRED"
                )
            return fn(*args, **kwargs)
        return wrapper
    return decorator


# -------------------------------------------------------------
# Scoping & Multi-Tenant Boundary Verification Guards
# -------------------------------------------------------------

def verify_tenant_access(target_institution_id: Union[str, uuid.UUID]):
    """Ensure current request identity cannot read/mutate data belonging to another school."""
    claims = get_jwt()
    user_roles = set(claims.get("roles", []))

    if "super_admin" in user_roles:
        return True

    user_inst_id = str(claims.get("institution_id", ""))
    target_id_str = str(target_institution_id)

    if not user_inst_id or user_inst_id != target_id_str:
        raise APIException(
            message="Access denied: Cross-institution data access is strictly prohibited.",
            status_code=403,
            error_code="CROSS_TENANT_ACCESS_DENIED"
        )
    return True


def verify_parent_access(parent_user_id: Union[str, uuid.UUID], student_id: Union[str, uuid.UUID]):
    """Verify that a parent user has a legitimate guardian relationship to the requested student."""
    claims = get_jwt()
    user_roles = set(claims.get("roles", []))

    if "super_admin" in user_roles or "school_admin" in user_roles:
        return True

    # Find parent record for user
    parent = Parent.query.filter_by(user_id=parent_user_id).first()
    if not parent:
        raise APIException(
            message="No parent/guardian profile associated with current account.",
            status_code=403,
            error_code="PARENT_PROFILE_NOT_FOUND"
        )

    link = StudentParent.query.filter_by(parent_id=parent.id, student_id=student_id).first()
    if not link:
        raise APIException(
            message="Access denied: You are not authorized to view or manage this student.",
            status_code=403,
            error_code="PARENT_STUDENT_ACCESS_DENIED"
        )
    return True


def verify_teacher_class_access(teacher_user_id: Union[str, uuid.UUID], section_id: Union[str, uuid.UUID], subject_id: Optional[Union[str, uuid.UUID]] = None):
    """Verify that a teacher is formally allocated to instruct the designated class section."""
    claims = get_jwt()
    user_roles = set(claims.get("roles", []))

    if "super_admin" in user_roles or "school_admin" in user_roles:
        return True

    query = TeacherAssignment.query.join(ClassSubject).filter(
        TeacherAssignment.teacher_id == teacher_user_id,
        ClassSubject.section_id == section_id,
    )
    if subject_id:
        query = query.filter(ClassSubject.subject_id == subject_id)

    assignment = query.first()
    if not assignment:
        raise APIException(
            message="Access denied: You are not assigned to instruct this class section.",
            status_code=403,
            error_code="TEACHER_CLASS_ACCESS_DENIED"
        )
    return True

