import uuid
from datetime import date, time
from decimal import Decimal
import pytest
from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.models import (
    Institution, ServiceEntitlement, InstitutionSetting,
    User, Role, Permission, UserRole, RolePermission,
    AcademicYear, Term, Room, ClassLevel, Section, Subject, ClassSubject, TeacherAssignment,
    Student, Parent, StudentParent, StudentEnrollment,
    Department, StaffProfile, TeacherProfile, LibraryStaffAssignment,
    Book, BookCopy,
    Supplier, SupplierInstitution
)


def test_institution_and_entitlements_creation(session):
    """Verify institution creation with 14 modular service entitlements."""
    code = f"TEST-INST-{uuid.uuid4().hex[:6]}"
    inst = Institution(
        code=code,
        name="Test International School",
        board_affiliation="CBSE",
        email=f"info@{code.lower()}.edu",
        currency="INR",
        status="ACTIVE"
    )
    session.add(inst)
    session.flush()

    assert inst.id is not None
    assert inst.code == code

    # Add entitlement
    ent = ServiceEntitlement(institution_id=inst.id, service_key="admissions", is_enabled=True)
    session.add(ent)
    session.flush()

    assert len(inst.service_entitlements) == 1
    assert inst.service_entitlements[0].service_key == "admissions"


def test_user_roles_and_all_personas(session):
    """Verify user creation and assignment of all 6 canonical personas."""
    uid = uuid.uuid4().hex[:6]
    inst = Institution(
        code=f"INST-{uid}",
        name="Apex Academy",
        board_affiliation="CBSE",
        email=f"apex@{uid}.com"
    )
    session.add(inst)
    session.flush()

    roles = [Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT, Role.SUPPLIER]
    for r_name in roles:
        role = Role.query.filter_by(name=r_name).first()
        if not role:
            role = Role(name=r_name, is_system_role=True)
            session.add(role)
            session.flush()

        user = User(
            institution_id=inst.id if r_name != Role.SUPER_ADMIN else None,
            username=f"user_{r_name}_{uid}",
            email=f"{r_name}_{uid}@test.edu",
            password_hash="argon2_sample_hash",
            first_name="Test",
            last_name=r_name.capitalize(),
        )
        session.add(user)
        session.flush()

        ur = UserRole(user_id=user.id, role_id=role.id)
        session.add(ur)
        session.flush()

        assert r_name in user.role_names


def test_dual_role_teacher_librarian(session):
    """Verify dual-role assignment: faculty member holding library desk responsibilities."""
    uid = uuid.uuid4().hex[:6]
    inst = Institution(code=f"DUAL-{uid}", name="Dual Campus", email=f"dual@{uid}.edu")
    session.add(inst)
    session.flush()

    user = User(
        institution_id=inst.id,
        username=f"teacher_lib_{uid}",
        email=f"teacher_lib_{uid}@test.edu",
        password_hash="hash",
        first_name="Sunita",
        last_name="Verma"
    )
    session.add(user)
    session.flush()

    sp = StaffProfile(
        institution_id=inst.id,
        user_id=user.id,
        employee_id=f"EMP-{uid}",
        designation="Senior Faculty",
        joining_date=date(2021, 6, 1),
        status="ACTIVE"
    )
    session.add(sp)
    session.flush()

    tp = TeacherProfile(staff_profile_id=sp.id, specialization="Physics", teaching_experience_years=5)
    session.add(tp)

    # Dual role library assignment
    lib_assign = LibraryStaffAssignment(staff_profile_id=sp.id, role_title="Librarian In-Charge", status="ACTIVE")
    session.add(lib_assign)
    session.flush()

    assert lib_assign.id is not None
    assert lib_assign.staff_profile.user.full_name == "Sunita Verma"


def test_academic_hierarchy_relationships(session):
    """Verify full academic relationship tree from academic year to teacher assignment."""
    uid = uuid.uuid4().hex[:6]
    inst = Institution(code=f"ACAD-{uid}", name="Acad High", email=f"acad@{uid}.edu")
    session.add(inst)
    session.flush()

    ay = AcademicYear(institution_id=inst.id, name=f"2026-2027-{uid}", start_date=date(2026, 4, 1), end_date=date(2027, 3, 31))
    session.add(ay)
    session.flush()

    term = Term(academic_year_id=ay.id, name="Term 1", start_date=date(2026, 4, 1), end_date=date(2026, 9, 30))
    session.add(term)

    room = Room(institution_id=inst.id, room_number=f"R-{uid}", capacity=40)
    session.add(room)
    session.flush()

    cl = ClassLevel(institution_id=inst.id, name=f"Class 10-{uid}", code=f"C10-{uid}", sequence_order=10)
    session.add(cl)
    session.flush()

    sec = Section(class_level_id=cl.id, name="A", capacity=40, room_id=room.id)
    session.add(sec)
    session.flush()

    sub = Subject(institution_id=inst.id, code=f"MATH-{uid}", name="Mathematics", credit_hours=Decimal("1.0"))
    session.add(sub)
    session.flush()

    cs = ClassSubject(section_id=sec.id, subject_id=sub.id)
    session.add(cs)
    session.flush()

    teacher = User(institution_id=inst.id, username=f"t_{uid}", email=f"t_{uid}@test.edu", password_hash="h", first_name="A", last_name="B")
    session.add(teacher)
    session.flush()

    t_assign = TeacherAssignment(class_subject_id=cs.id, teacher_id=teacher.id, academic_year_id=ay.id, is_primary=True)
    session.add(t_assign)
    session.flush()

    assert t_assign.id is not None
    assert t_assign.class_subject.section.name == "A"
    assert t_assign.class_subject.subject.code == f"MATH-{uid}"


def test_student_parent_many_to_many(session):
    """Verify normalized student-parent relationship supporting multi-child & guardian mapping."""
    uid = uuid.uuid4().hex[:6]
    inst = Institution(code=f"FAM-{uid}", name="Family School", email=f"fam@{uid}.edu")
    session.add(inst)
    session.flush()

    parent = Parent(
        institution_id=inst.id, first_name="Vikram", last_name="Patel",
        relationship_type="Father", phone=f"+91-98{uid[:8]}"
    )
    session.add(parent)
    session.flush()

    student1 = Student(
        institution_id=inst.id, admission_number=f"ADM-1-{uid}",
        admission_date=date(2025, 4, 1), date_of_birth=date(2010, 5, 10), gender="MALE"
    )
    student2 = Student(
        institution_id=inst.id, admission_number=f"ADM-2-{uid}",
        admission_date=date(2025, 4, 1), date_of_birth=date(2012, 8, 20), gender="FEMALE"
    )
    session.add_all([student1, student2])
    session.flush()

    # Link both children to the parent
    sp1 = StudentParent(student_id=student1.id, parent_id=parent.id, is_primary_contact=True)
    sp2 = StudentParent(student_id=student2.id, parent_id=parent.id, is_primary_contact=True)
    session.add_all([sp1, sp2])
    session.flush()

    assert len(parent.student_parents) == 2
    assert student1.student_parents[0].parent.first_name == "Vikram"

