"""Object-level access checks (parent -> child, teacher -> section).

Role/permission decorators live in app.auth.
"""
from flask import g

from app.models import ClassSubject, Parent, StudentParent, TeacherAssignment
from app.utils.errors import APIException


def _is_admin() -> bool:
    roles = getattr(g, "roles", set())
    return "super_admin" in roles or "school_admin" in roles


def verify_parent_access(student_id) -> None:
    if _is_admin():
        return
    parent = Parent.query.filter_by(user_id=g.user_id).first()
    if not parent or not StudentParent.query.filter_by(parent_id=parent.id, student_id=student_id).first():
        raise APIException("You are not authorized to access this student.", status_code=403,
                           error_code="PARENT_STUDENT_ACCESS_DENIED")


def verify_teacher_class_access(section_id, subject_id=None) -> None:
    if _is_admin():
        return
    query = TeacherAssignment.query.join(ClassSubject).filter(
        TeacherAssignment.teacher_id == g.user_id,
        ClassSubject.section_id == section_id,
    )
    if subject_id:
        query = query.filter(ClassSubject.subject_id == subject_id)
    if not query.first():
        raise APIException("You are not assigned to this class section.", status_code=403,
                           error_code="TEACHER_CLASS_ACCESS_DENIED")
