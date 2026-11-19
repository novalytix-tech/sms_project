"""Account provisioning: single and bulk invites, student attachment, parent-child links."""
import uuid

import pytest
import requests

from app.extensions import db
from app.models import Institution, Parent, Student, StudentParent, User
from tests.conftest import ADMIN, PARENT, TEACHER, mint_token

USERS = "/api/v1/users"


@pytest.fixture
def invites(monkeypatch):
    sent = []

    def fake_invite(email, redirect_url=None):
        if email.startswith("fail"):
            raise requests.RequestException("clerk down")
        sent.append(email)
        return {}

    monkeypatch.setattr("app.api.v1.users.create_invitation", fake_invite)
    return sent


def _school_students(n=3):
    inst = Institution.query.filter_by(code="STXAV-DELHI").one()
    return Student.query.filter_by(institution_id=inst.id).order_by(Student.admission_number).limit(n).all()


def _email(prefix="u"):
    return f"{prefix}.{uuid.uuid4().hex[:8]}@example.test"


def test_create_parent_with_children_sends_invite(client, login, invites):
    kids = _school_students(2)
    email = _email("parent")
    res = client.post(USERS, headers=login(ADMIN), json={
        "first_name": "Meena", "last_name": "Rao", "email": email, "role": "parent",
        "child_admission_numbers": f"{kids[0].admission_number}, {kids[1].admission_number}"})
    assert res.status_code == 201, res.get_json()
    assert res.get_json()["data"]["invitation_status"] == "invited"
    assert invites == [email]
    user = User.query.filter_by(email=email).one()
    children = client.get(f"{USERS}/{user.id}/children", headers=login(ADMIN)).get_json()["data"]
    assert {c["admission_number"] for c in children} == {kids[0].admission_number, kids[1].admission_number}


def test_parent_with_unknown_child_is_rejected_atomically(client, login, invites):
    email = _email("parent")
    res = client.post(USERS, headers=login(ADMIN), json={
        "first_name": "A", "last_name": "B", "email": email, "role": "parent", "child_admission_numbers": "NOPE-999"})
    assert res.status_code == 422
    assert User.query.filter_by(email=email).first() is None and invites == []


def test_student_account_attaches_to_existing_record(client, login, invites):
    student = _school_students(3)[2]
    student.user.clerk_user_id = None
    db.session.commit()
    old_user_id = student.user_id
    email = _email("student")
    res = client.post(USERS, headers=login(ADMIN), json={
        "first_name": "Ayush", "last_name": "Singhal", "email": email, "role": "student",
        "admission_number": student.admission_number})
    assert res.status_code == 201, res.get_json()
    db.session.refresh(student)
    assert student.user_id == old_user_id  # same user row, now with a real email
    assert student.user.email == email
    # and that student can now be signed in and sees themselves
    student.user.clerk_user_id = f"user_{uuid.uuid4().hex[:20]}"
    db.session.commit()
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {mint_token(student.user.clerk_user_id)}"})
    assert me.get_json()["data"]["references"]["student_id"] == str(student.id)


def test_student_without_admission_number_rejected(client, login, invites):
    res = client.post(USERS, headers=login(ADMIN), json={
        "first_name": "X", "last_name": "Y", "email": _email(), "role": "student"})
    assert res.status_code == 422


def test_bulk_invite_reports_each_row(client, login, invites):
    kids = _school_students(1)
    good_teacher, good_parent, fail_mail = _email("teacher"), _email("parent"), _email("fail")
    rows = [
        {"first_name": "T", "last_name": "One", "email": good_teacher, "role": "teacher"},
        {"first_name": "P", "last_name": "One", "email": good_parent, "role": "parent",
         "child_admission_numbers": kids[0].admission_number},
        {"first_name": "Dup", "last_name": "Row", "email": good_teacher, "role": "teacher"},
        {"first_name": "Bad", "last_name": "Role", "email": _email(), "role": "janitor"},
        {"first_name": "No", "last_name": "Email", "email": "not-an-email", "role": "teacher"},
        {"first_name": "Exist", "last_name": "Ing", "email": TEACHER, "role": "teacher"},
        {"first_name": "Mail", "last_name": "Fails", "email": fail_mail, "role": "teacher"},
    ]
    res = client.post(f"{USERS}/bulk-invite", headers=login(ADMIN), json={"rows": rows})
    assert res.status_code == 200, res.get_json()
    data = res.get_json()["data"]
    assert data["created"] == 3 and data["skipped"] == 4 and data["invitations_failed"] == 1
    by_row = {r["row"]: r for r in data["results"]}
    assert by_row[2]["status"] == "created" and by_row[3]["status"] == "created"
    assert "Duplicate" in by_row[4]["reason"]
    assert "Role must be" in by_row[5]["reason"]
    assert "email" in by_row[6]["reason"]
    assert "already exists" in by_row[7]["reason"]
    assert by_row[8]["invitation_status"] == "invite_failed"
    assert set(invites) == {good_teacher, good_parent}
    parent = Parent.query.join(User, Parent.user_id == User.id).filter(User.email == good_parent).one()
    assert StudentParent.query.filter_by(parent_id=parent.id, student_id=kids[0].id).first()


def test_bulk_invite_limits_and_permissions(client, login, invites):
    assert client.post(f"{USERS}/bulk-invite", headers=login(ADMIN), json={"rows": []}).status_code == 422
    assert client.post(f"{USERS}/bulk-invite", headers=login(ADMIN), json={"rows": [{}] * 501}).status_code == 422
    assert client.post(f"{USERS}/bulk-invite", headers=login(TEACHER),
                       json={"rows": [{"email": _email(), "role": "teacher"}]}).status_code == 403


def test_link_and_unlink_child(client, login, invites):
    kids = _school_students(3)
    parent_user = User.query.filter_by(email=PARENT).one()
    h = login(ADMIN)
    res = client.post(f"{USERS}/{parent_user.id}/children", headers=h, json={"admission_number": kids[2].admission_number})
    assert res.status_code == 200
    assert kids[2].admission_number in {c["admission_number"] for c in res.get_json()["data"]}
    res = client.delete(f"{USERS}/{parent_user.id}/children/{kids[2].id}", headers=h)
    assert kids[2].admission_number not in {c["admission_number"] for c in res.get_json()["data"]}
    assert client.post(f"{USERS}/{parent_user.id}/children", headers=h,
                       json={"admission_number": "DOES-NOT-EXIST"}).status_code == 404
    teacher = User.query.filter_by(email=TEACHER).one()
    assert client.get(f"{USERS}/{teacher.id}/children", headers=h).status_code == 422
    assert client.get(f"{USERS}/{parent_user.id}/children", headers=login(TEACHER)).status_code == 403
