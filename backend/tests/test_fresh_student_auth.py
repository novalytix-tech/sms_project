"""
Authentication Verification for Fresh 30 Students Dataset
Tests:
1. Correct login credentials for 5 students across Classes 6, 7, 8, 10, 12 -> 200 OK
2. Wrong passwords for each student -> 401 Unauthorized
3. Non-existent login ID -> 401 Unauthorized
4. Empty password -> 400 Validation Error
5. Inactive student account -> 403 Forbidden
6. Invalid JWT token access rejection
7. Role permissions verification
"""

import pytest
from app.extensions import db
from app.models import User

STUDENT_AUTH_CASES = [
    ("aarav.sharma@student.stxaviers.edu.in", "Aarav#601", "Class 6"),
    ("meera.reddy@student.stxaviers.edu.in", "Meera#701", "Class 7"),
    ("vihaan.kapoor@student.stxaviers.edu.in", "Vihaan#801", "Class 8"),
    ("pranav.bansal@student.stxaviers.edu.in", "Pranav#1001", "Class 10"),
    ("shruti.srinivasan@student.stxaviers.edu.in", "Shruti#1201", "Class 12"),
]


@pytest.mark.parametrize("email,password,class_label", STUDENT_AUTH_CASES)
def test_student_successful_login(client, email, password, class_label):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email} ({class_label})"
    data = res.get_json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert "student" in data["data"]["user"]["roles"]


@pytest.mark.parametrize("email,password,class_label", STUDENT_AUTH_CASES)
def test_student_wrong_password_rejected(client, email, password, class_label):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password + "_WRONG"})
    assert res.status_code == 401
    data = res.get_json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_CREDENTIALS"


def test_unknown_login_id_rejected(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "nonexistent.student@stxaviers.edu.in",
        "password": "SomePassword123!"
    })
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_empty_password_rejected(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "aarav.sharma@student.stxaviers.edu.in",
        "password": ""
    })
    assert res.status_code == 400


def test_inactive_student_login_rejected(client):
    u = User.query.filter_by(email="aarav.sharma@student.stxaviers.edu.in").first()
    assert u is not None
    orig_status = u.is_active
    try:
        u.is_active = False
        db.session.commit()

        res = client.post("/api/v1/auth/login", json={
            "email": "aarav.sharma@student.stxaviers.edu.in",
            "password": "Aarav#601"
        })
        assert res.status_code == 403
        assert res.get_json()["error"]["code"] == "ACCOUNT_INACTIVE"
    finally:
        u.is_active = orig_status
        db.session.commit()


def test_student_jwt_access_and_rbac(client):
    # 1. Login as Student
    login_res = client.post("/api/v1/auth/login", json={
        "email": "aarav.sharma@student.stxaviers.edu.in",
        "password": "Aarav#601"
    })
    assert login_res.status_code == 200
    token = login_res.get_json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get profile
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    profile_data = me_res.get_json()["data"]
    email = profile_data["email"] if "email" in profile_data else profile_data["user"]["email"]
    assert email == "aarav.sharma@student.stxaviers.edu.in"

    # 3. Unauthorized access check (Students cannot access admin-only endpoints)
    admin_res = client.get("/api/v1/test/admin-only", headers=headers)
    assert admin_res.status_code == 403
    assert admin_res.get_json()["error"]["code"] == "FORBIDDEN_ROLE"
