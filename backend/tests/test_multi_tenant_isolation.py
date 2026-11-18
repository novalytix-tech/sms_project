import uuid
from datetime import date
import pytest
from app.extensions import db
from app.models import Institution, Student, ClassLevel, Section, AcademicYear, User, Role, UserRole, Parent, StudentParent
from app.utils.security import hash_password


def test_cross_tenant_isolation_enforced(app, client, auth_headers):
    stud_b_id = None
    with app.app_context():
        # Create second test institution B
        inst_b = Institution.query.filter_by(code="CAMPUS-B-PUNE").first()
        if not inst_b:
            inst_b = Institution(
                name="St. Xavier's Pune Campus",
                code="CAMPUS-B-PUNE",
                email="admin@pune.stxaviers.edu.in",
                board_affiliation="CBSE",
                currency="INR",
                status="ACTIVE",
            )
            db.session.add(inst_b)
            db.session.flush()

            # Create school admin for Institution B
            u_b = User(
                institution_id=inst_b.id,
                username="admin_pune",
                email="admin.pune@stxaviers.edu.in",
                password_hash=hash_password("SchoolERP@Demo2026!"),
                first_name="Rajesh",
                last_name="Deshmukh",
                is_active=True,
            )
            db.session.add(u_b)
            db.session.flush()

            school_admin_role = Role.query.filter_by(name="school_admin").first()
            db.session.add(UserRole(user_id=u_b.id, role_id=school_admin_role.id))

            # Create a student in Institution B
            stud_b = Student(
                institution_id=inst_b.id,
                user_id=None,
                admission_number="PUNE-2026-001",
                admission_date=date(2026, 4, 1),
                date_of_birth=date(2012, 1, 1),
                gender="MALE",
                status="ACTIVE",
            )
            db.session.add(stud_b)
            db.session.commit()
            stud_b_id = str(stud_b.id)
        else:
            stud_b = Student.query.filter_by(institution_id=inst_b.id).first()
            stud_b_id = str(stud_b.id)

    # 1. Login as Admin A (Delhi)
    headers_a = auth_headers("principal@stxaviers.edu.in")

    # 2. Query students list as Admin A - must NOT contain student from Institution B
    res_a = client.get("/api/v1/students", headers=headers_a)
    assert res_a.status_code == 200
    items_a = res_a.get_json()["data"]["items"]
    assert all(s["admission_number"] != "PUNE-2026-001" for s in items_a)

    # 3. Direct GET by ID of student B using Admin A's credentials must return 404 (tenant-scoped query)
    res_direct = client.get(f"/api/v1/students/{stud_b_id}", headers=headers_a)
    assert res_direct.status_code == 404
    assert res_direct.get_json()["success"] is False

    # 4. Attempt to mutate student B using Admin A's token
    res_mutate = client.put(f"/api/v1/students/{stud_b_id}", json={
        "status": "WITHDRAWN"
    }, headers=headers_a)
    assert res_mutate.status_code == 404


def test_parent_child_access_boundary(app, client, auth_headers):
    # Login as parent Vikram Patel
    headers_parent = auth_headers("vikram.patel@gmail.com")
    aarav_id = None
    other_stud_id = None

    with app.app_context():
        # Get Aarav Patel's student record (Vikram's child)
        aarav = Student.query.filter_by(admission_number="ADM-2026-0101").first()
        assert aarav is not None
        aarav_id = str(aarav.id)

        # Create a non-ward student
        inst = Institution.query.filter_by(code="STXAV-DELHI").first()
        other_stud = Student.query.filter_by(admission_number="OTHER-CHILD-999").first()
        if not other_stud:
            other_stud = Student(
                institution_id=inst.id,
                admission_number="OTHER-CHILD-999",
                admission_date=date.today(),
                date_of_birth=date(2011, 2, 2),
                gender="FEMALE",
                status="ACTIVE",
            )
            db.session.add(other_stud)
            db.session.commit()
            other_stud_id = str(other_stud.id)
        else:
            other_stud_id = str(other_stud.id)

    # Verify parent can access Aarav
    res_ward = client.get(f"/api/v1/test/parent-child/{aarav_id}", headers=headers_parent)
    assert res_ward.status_code == 200
    assert res_ward.get_json()["success"] is True

    # Verify parent is FORBIDDEN from accessing other student's data
    res_other = client.get(f"/api/v1/test/parent-child/{other_stud_id}", headers=headers_parent)
    assert res_other.status_code == 403
    assert res_other.get_json()["error"]["code"] == "PARENT_STUDENT_ACCESS_DENIED"
