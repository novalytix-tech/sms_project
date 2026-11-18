"""Authentication, authorization and tenant-isolation guarantees."""
import uuid
from datetime import date

import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.extensions import db
from app.models import Institution, Role, Student, User, UserRole
from tests.conftest import ADMIN, PARENT, SUPER, TEACHER, mint_token


@pytest.fixture
def other_school(app):
    """A second institution with one student and its own admin."""
    inst = Institution.query.filter_by(code="OTHER-SCHOOL").first()
    if not inst:
        inst = Institution(code="OTHER-SCHOOL", name="Other School", email="office@other.test")
        db.session.add(inst)
        db.session.flush()
        stu = Student(institution_id=inst.id, admission_number="OTH-1", admission_date=date.today(),
                      date_of_birth=date(2012, 1, 1), gender="FEMALE")
        admin = User(institution_id=inst.id, username="other.admin", email="admin@other.test",
                     first_name="Other", last_name="Admin", is_active=True)
        db.session.add_all([stu, admin])
        db.session.flush()
        db.session.add(UserRole(user_id=admin.id, role_id=Role.query.filter_by(name="school_admin").one().id))
        db.session.commit()
    return inst


# ---------- authentication ----------

def test_health_is_public_and_leaks_nothing(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.get_json()["data"]
    assert body == {"status": "healthy", "database": "connected"}
    assert res.headers["X-Content-Type-Options"] == "nosniff"


@pytest.mark.parametrize("path", ["/api/v1/students", "/api/v1/sync/store", "/api/v1/users", "/api/v1/auth/me",
                                  "/api/v1/finance/summary", "/api/v1/communications/messages"])
def test_protected_routes_require_token(client, path):
    assert client.get(path).status_code == 401


def test_delete_student_without_token_is_rejected(client):
    assert client.delete(f"/api/v1/students/{uuid.uuid4()}").status_code == 401


def test_token_signed_by_other_key_rejected(client, login):
    login(ADMIN)
    user = User.query.filter_by(email=ADMIN).one()
    forged = mint_token(user.clerk_user_id, key=rsa.generate_private_key(public_exponent=65537, key_size=2048))
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {forged}"}).status_code == 401


def test_expired_token_rejected(client, login):
    login(ADMIN)
    user = User.query.filter_by(email=ADMIN).one()
    expired = mint_token(user.clerk_user_id, exp_in=-120)
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired}"}).status_code == 401


def test_token_for_untrusted_origin_rejected(client, login):
    login(ADMIN)
    user = User.query.filter_by(email=ADMIN).one()
    evil = mint_token(user.clerk_user_id, azp="https://evil.example")
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {evil}"}).status_code == 401


def test_unprovisioned_clerk_user_gets_403(client, monkeypatch):
    monkeypatch.setattr("app.auth.get_verified_primary_email", lambda _id: "stranger@nowhere.test")
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {mint_token('user_stranger')}"})
    assert res.status_code == 403
    assert res.get_json()["error"]["code"] == "ACCOUNT_NOT_PROVISIONED"


def test_first_sign_in_links_by_verified_email(client, monkeypatch):
    user = User.query.filter_by(email=TEACHER).one()
    user.clerk_user_id = None
    db.session.commit()
    monkeypatch.setattr("app.auth.get_verified_primary_email", lambda _id: TEACHER)
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {mint_token('user_teacher_new')}"})
    assert res.status_code == 200
    assert res.get_json()["data"]["roles"] == ["teacher"]
    assert User.query.filter_by(email=TEACHER).one().clerk_user_id == "user_teacher_new"


def test_deactivated_user_rejected(client, login):
    headers = login(PARENT)
    user = User.query.filter_by(email=PARENT).one()
    user.is_active = False
    db.session.commit()
    try:
        assert client.get("/api/v1/auth/me", headers=headers).status_code == 403
    finally:
        user.is_active = True
        db.session.commit()


# ---------- authorization ----------

def test_teacher_cannot_manage_accounts_or_students(client, login):
    h = login(TEACHER)
    assert client.get("/api/v1/users", headers=h).status_code == 403
    assert client.post("/api/v1/students", json={"admission_number": "X"}, headers=h).status_code == 403
    assert client.get("/api/v1/students", headers=h).status_code == 200


def test_parent_cannot_list_students_or_dump_store(client, login):
    h = login(PARENT)
    assert client.get("/api/v1/students", headers=h).status_code == 403
    assert client.get("/api/v1/sync/store", headers=h).status_code == 403
    assert client.post("/api/v1/sync/store", json={}, headers=h).status_code == 403


def test_parent_cannot_mark_invoice_paid(client, login):
    h = login(PARENT)
    assert client.post(f"/api/v1/finance/invoices/{uuid.uuid4()}/pay", json={"amount": 1}, headers=h).status_code == 403


def test_parent_sees_only_linked_children(client, login):
    from app.models import Parent, StudentParent
    h = login(PARENT)
    parent = Parent.query.join(User, Parent.user_id == User.id).filter(User.email == PARENT).first()
    linked = {sp.student_id for sp in parent.student_parents} if parent else set()
    inst_id = User.query.filter_by(email=PARENT).one().institution_id
    other = Student.query.filter_by(admission_number="UNLINKED-1", institution_id=inst_id).first()
    if not other:
        other = Student(institution_id=inst_id, admission_number="UNLINKED-1", admission_date=date.today(),
                        date_of_birth=date(2013, 1, 1), gender="MALE")
        db.session.add(other)
        db.session.commit()
    assert client.get(f"/api/v1/students/{other.id}", headers=h).status_code == 403
    for sid in linked:
        assert client.get(f"/api/v1/students/{sid}", headers=h).status_code == 200


def test_admin_cannot_create_super_admin(client, login):
    res = client.post("/api/v1/users", json={"first_name": "A", "last_name": "B", "email": "x@y.test",
                                              "role": "super_admin"}, headers=login(ADMIN))
    assert res.status_code == 422


# ---------- tenant isolation ----------

def test_admin_cannot_read_other_school_student(client, login, other_school):
    other_student = Student.query.filter_by(institution_id=other_school.id).first()
    h = login(ADMIN)
    assert client.get(f"/api/v1/students/{other_student.id}", headers=h).status_code == 404
    assert client.delete(f"/api/v1/students/{other_student.id}", headers=h).status_code == 404
    ids = {s["id"] for s in client.get("/api/v1/students?limit=100", headers=h).get_json()["data"]["items"]}
    assert str(other_student.id) not in ids


def test_tenant_header_spoofing_ignored_for_school_users(client, login, other_school):
    h = {**login(ADMIN), "X-Institution-Id": str(other_school.id)}
    store = client.get("/api/v1/sync/store", headers=h).get_json()["data"]
    assert {i["id"] for i in store["institutions"]} != {str(other_school.id)}
    assert all(s["institutionId"] != str(other_school.id) for s in store["students"])


def test_admin_cannot_toggle_other_school_user(client, login, other_school):
    other_admin = User.query.filter_by(email="admin@other.test").one()
    res = client.post(f"/api/v1/users/{other_admin.id}/toggle-status", headers=login(ADMIN))
    assert res.status_code == 404


def test_super_admin_can_choose_tenant(client, login, other_school):
    h = {**login(SUPER), "X-Institution-Id": str(other_school.id)}
    other_student = Student.query.filter_by(institution_id=other_school.id).first()
    assert client.get(f"/api/v1/students/{other_student.id}", headers=h).status_code == 200


# ---------- public enquiry ----------

def test_public_enquiry_requires_valid_school_code(client):
    assert client.post("/api/v1/admissions/inquiries", json={"phone": "999"}).status_code == 400
    res = client.post("/api/v1/admissions/inquiries",
                      json={"institution_code": "STXAV-DELHI", "phone": "+91 90000 00000", "first_name": "Test"})
    assert res.status_code == 201


def test_messages_only_returns_own_conversations(client, login):
    h = login(TEACHER)
    me = str(User.query.filter_by(email=TEACHER).one().id)
    other = User.query.filter_by(email=ADMIN).one()
    res = client.get(f"/api/v1/communications/messages?user_id={other.id}", headers=h)
    assert res.status_code == 200
    assert all(me in (m["sender_id"], m["recipient_id"]) for m in res.get_json()["data"])
