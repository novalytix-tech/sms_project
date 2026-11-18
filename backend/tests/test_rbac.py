import uuid
from app.models import Student, Section, Institution, User
from app.extensions import db


def test_unauthorized_api_access(client):
    """Test 19: Accessing protected endpoints without an Authorization header returns HTTP 401."""
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
    data = res.get_json()
    assert data["success"] is False
    assert data["error"]["code"] == "AUTHORIZATION_REQUIRED"


def test_role_based_access_restrictions(client, auth_headers):
    """Test 20: Role-based restrictions prevent unauthorized roles from executing privileged actions."""
    # Teacher trying to access admin-only endpoint -> 403 Forbidden
    teacher_headers = auth_headers("ananya.sharma@stxaviers.edu.in")
    res_teacher = client.get("/api/v1/test/admin-only", headers=teacher_headers)
    assert res_teacher.status_code == 403
    assert res_teacher.get_json()["error"]["code"] == "FORBIDDEN_ROLE"

    # School admin accessing admin-only endpoint -> 200 OK
    admin_headers = auth_headers("principal@stxaviers.edu.in")
    res_admin = client.get("/api/v1/test/admin-only", headers=admin_headers)
    assert res_admin.status_code == 200

    # School admin has finance:write permission -> 200 OK
    res_perm = client.get("/api/v1/test/finance-write", headers=admin_headers)
    assert res_perm.status_code == 200


def test_parent_child_access_restrictions(client, auth_headers, app):
    """Test 21: Parent can only access their own linked child and is rejected for unlinked students."""
    parent_headers = auth_headers("vikram.patel@gmail.com")

    with app.app_context():
        # Aarav Patel is linked to Vikram Patel
        linked_student = Student.query.filter_by(admission_number="ADM-2026-0101").first()
        linked_id = str(linked_student.id)

        # Create an unlinked student in the same institution
        unlinked_student = Student.query.filter_by(admission_number="ADM-OTHER-999").first()
        if not unlinked_student:
            inst = Institution.query.filter_by(code="STXAV-DELHI").first()
            unlinked_student = Student(
                institution_id=inst.id,
                admission_number="ADM-OTHER-999",
                admission_date=linked_student.admission_date,
                date_of_birth=linked_student.date_of_birth,
                gender="FEMALE",
                status="ACTIVE"
            )
            db.session.add(unlinked_student)
            db.session.commit()
        unlinked_id = str(unlinked_student.id)

    # 1. Accessing own linked child -> 200 OK
    res_linked = client.get(f"/api/v1/test/parent-child/{linked_id}", headers=parent_headers)
    assert res_linked.status_code == 200

    # 2. Accessing unlinked student -> 403 Forbidden
    res_unlinked = client.get(f"/api/v1/test/parent-child/{unlinked_id}", headers=parent_headers)
    assert res_unlinked.status_code == 403
    assert res_unlinked.get_json()["error"]["code"] == "PARENT_STUDENT_ACCESS_DENIED"


def test_teacher_class_restrictions(client, auth_headers, app):
    """Test 22: Teacher can only manage assigned sections and is rejected for unassigned classes."""
    teacher_headers = auth_headers("ananya.sharma@stxaviers.edu.in")

    with app.app_context():
        # Section 10-A is assigned to Ananya Sharma
        assigned_section = Section.query.filter_by(name="A").first()
        assigned_id = str(assigned_section.id)

        # Create an unassigned section B
        unassigned_section = Section.query.filter_by(name="B").first()
        if not unassigned_section:
            unassigned_section = Section(
                class_level_id=assigned_section.class_level_id,
                name="B",
                capacity=40
            )
            db.session.add(unassigned_section)
            db.session.commit()
        unassigned_id = str(unassigned_section.id)

    # 1. Assigned section -> 200 OK
    res_assigned = client.get(f"/api/v1/test/teacher-class/{assigned_id}", headers=teacher_headers)
    assert res_assigned.status_code == 200

    # 2. Unassigned section -> 403 Forbidden
    res_unassigned = client.get(f"/api/v1/test/teacher-class/{unassigned_id}", headers=teacher_headers)
    assert res_unassigned.status_code == 403
    assert res_unassigned.get_json()["error"]["code"] == "TEACHER_CLASS_ACCESS_DENIED"


def test_cross_institution_access_prevention(client, auth_headers, app):
    """Test 23: Tenant boundaries strictly prevent cross-school data access, while super_admin can inspect all."""
    school_admin_headers = auth_headers("principal@stxaviers.edu.in")
    super_admin_headers = auth_headers("superadmin@novalytix.com")

    with app.app_context():
        # St. Xavier's institution
        stx_inst = Institution.query.filter_by(code="STXAV-DELHI").first()
        stx_id = str(stx_inst.id)

        # Foreign institution
        foreign_inst = Institution.query.filter_by(code="FOREIGN-SCHOOL-99").first()
        if not foreign_inst:
            foreign_inst = Institution(
                code="FOREIGN-SCHOOL-99",
                name="Other Academy",
                board_affiliation="ICSE",
                email="other@academy.edu",
                status="ACTIVE"
            )
            db.session.add(foreign_inst)
            db.session.commit()
        foreign_id = str(foreign_inst.id)

    # 1. School Admin accessing own institution -> 200 OK
    res_own = client.get(f"/api/v1/test/tenant-guard/{stx_id}", headers=school_admin_headers)
    assert res_own.status_code == 200

    # 2. School Admin attempting to access foreign institution -> 403 Forbidden
    res_foreign = client.get(f"/api/v1/test/tenant-guard/{foreign_id}", headers=school_admin_headers)
    assert res_foreign.status_code == 403
    assert res_foreign.get_json()["error"]["code"] == "CROSS_TENANT_ACCESS_DENIED"

    # 3. Super Admin accessing foreign institution -> 200 OK (Platform-wide supervision)
    res_super = client.get(f"/api/v1/test/tenant-guard/{foreign_id}", headers=super_admin_headers)
    assert res_super.status_code == 200


def test_token_blocklist_immediate_revocation(client, auth_headers):
    """Test 24: Revoked tokens cannot access endpoints even if structurally valid and unexpired."""
    headers = auth_headers("orders@apexsupplies.in")

    # 1. Endpoint works
    r1 = client.get("/api/v1/auth/me", headers=headers)
    assert r1.status_code == 200

    # 2. User logs out
    r_logout = client.post("/api/v1/auth/logout", headers=headers)
    assert r_logout.status_code == 200

    # 3. Same token immediately blocked
    r2 = client.get("/api/v1/auth/me", headers=headers)
    assert r2.status_code == 401
    assert r2.get_json()["error"]["code"] == "TOKEN_REVOKED"

