"""Attendance: roll call, teacher class restriction, parent/student visibility, staff corrections."""
from datetime import date, timedelta

import pytest

from app.extensions import db
from app.models import (
    AttendanceAuditCorrection, Institution, Parent, Section, StudentEnrollment, StudentParent, User,
)
from tests.conftest import ADMIN, PARENT, TEACHER

ATT = "/api/v1/attendance"
TODAY = date.today().isoformat()


def _sections():
    inst = Institution.query.filter_by(code="STXAV-DELHI").one()
    teacher = User.query.filter_by(email=TEACHER).one()
    secs = [e.section for e in StudentEnrollment.query.filter_by(status="ACTIVE").all()
            if e.section and e.section.class_level.institution_id == inst.id]
    secs = list({s.id: s for s in secs}.values())
    own = next(s for s in secs if s.class_teacher_id == teacher.id)
    other = next(s for s in secs if s.id != own.id and s.class_teacher_id != teacher.id)
    return own, other


def _students(section):
    return [e.student_id for e in StudentEnrollment.query.filter_by(section_id=section.id, status="ACTIVE")]


def _roll(client, h, section, statuses, day=TODAY):
    return client.post(f"{ATT}/students/batch", headers=h, json={
        "date": day, "classId": str(section.id),
        "records": [{"studentId": str(s), "status": st} for s, st in statuses],
    })


def test_teacher_marks_own_class_and_reads_it_back(client, login):
    own, _ = _sections()
    students = _students(own)
    h = login(TEACHER)
    res = _roll(client, h, own, [(students[0], "present"), (students[1] if len(students) > 1 else students[0], "late")])
    assert res.status_code == 200, res.get_json()
    records = client.get(f"{ATT}/students?date={TODAY}&class_id={own.id}", headers=h).get_json()["data"]
    by_student = {r["studentId"]: r for r in records}
    assert by_student[str(students[0])]["status"] == "present"
    assert by_student[str(students[0])]["classId"] == str(own.id)


def test_teacher_cannot_mark_or_read_other_class(client, login):
    own, other = _sections()
    h = login(TEACHER)
    res = _roll(client, h, other, [(_students(other)[0], "absent")])
    assert res.status_code == 403
    _roll(client, login(ADMIN), other, [(_students(other)[0], "absent")])
    seen = client.get(f"{ATT}/students?date={TODAY}", headers=h).get_json()["data"]
    assert all(r["classId"] != str(other.id) for r in seen)


def test_validation(client, login):
    own, other = _sections()
    h = login(ADMIN)
    future = (date.today() + timedelta(days=2)).isoformat()
    assert _roll(client, h, own, [(_students(own)[0], "present")], day=future).status_code == 422
    assert _roll(client, h, own, [(_students(own)[0], "sleeping")]).status_code == 422
    # student from another class in this roll call
    assert _roll(client, h, own, [(_students(other)[0], "present")]).status_code == 422


def test_not_marked_removes_and_past_change_is_audited(client, login):
    own, _ = _sections()
    s = _students(own)[0]
    h = login(ADMIN)
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    _roll(client, h, own, [(s, "present")], day=yesterday)
    before = AttendanceAuditCorrection.query.filter_by(attendance_type="STUDENT").count()
    _roll(client, h, own, [(s, "absent")], day=yesterday)
    assert AttendanceAuditCorrection.query.filter_by(attendance_type="STUDENT").count() == before + 1

    res = _roll(client, h, own, [(s, "not_marked")], day=yesterday)
    assert res.get_json()["data"]["removed"] == 1
    left = client.get(f"{ATT}/students?date={yesterday}&student_id={s}", headers=h).get_json()["data"]
    assert left == []


def test_parent_sees_only_linked_child_and_cannot_write(client, login):
    own, other = _sections()
    child, stranger = _students(own)[0], _students(other)[0]
    parent = Parent.query.join(User, Parent.user_id == User.id).filter(User.email == PARENT).one()
    StudentParent.query.filter_by(parent_id=parent.id).delete()
    db.session.add(StudentParent(parent_id=parent.id, student_id=child, is_primary_contact=True))
    db.session.commit()

    admin = login(ADMIN)
    _roll(client, admin, own, [(child, "present")])
    _roll(client, admin, other, [(stranger, "absent")])

    h = login(PARENT)
    records = client.get(f"{ATT}/students", headers=h).get_json()["data"]
    assert records and {r["studentId"] for r in records} == {str(child)}
    assert client.get(f"{ATT}/students?student_id={stranger}", headers=h).get_json()["data"] == []
    assert _roll(client, h, own, [(child, "absent")]).status_code == 403


def test_staff_attendance_admin_only_and_teacher_sees_self(client, login):
    teacher = User.query.filter_by(email=TEACHER).one()
    other_teacher = User.query.filter_by(email="sunita.verma@stxaviers.edu.in").one()
    admin = login(ADMIN)
    res = client.post(f"{ATT}/staff/batch", headers=admin, json={"records": [
        {"teacherId": str(teacher.id), "date": TODAY, "status": "present", "checkInTime": "08:05"},
        {"teacherId": str(other_teacher.id), "date": TODAY, "status": "half_day"},
    ]})
    assert res.status_code == 200, res.get_json()
    rec = next(r for r in res.get_json()["data"] if r["teacherId"] == str(teacher.id))
    assert rec["checkInTime"] == "08:05" and rec["status"] == "present"

    h = login(TEACHER)
    mine = client.get(f"{ATT}/staff?date={TODAY}", headers=h).get_json()["data"]
    assert {r["teacherId"] for r in mine} == {str(teacher.id)}
    assert client.post(f"{ATT}/staff/batch", headers=h, json={"records": [
        {"teacherId": str(teacher.id), "date": TODAY, "status": "present"}]}).status_code == 403

    bad_time = client.post(f"{ATT}/staff/batch", headers=admin, json={"records": [
        {"teacherId": str(teacher.id), "date": TODAY, "status": "present", "checkInTime": "10:00", "checkOutTime": "09:00"}]})
    assert bad_time.status_code == 422


def test_staff_correction_requires_reason_and_is_audited(client, login):
    teacher = User.query.filter_by(email=TEACHER).one()
    admin = login(ADMIN)
    rec = client.post(f"{ATT}/staff/batch", headers=admin, json={"records": [
        {"teacherId": str(teacher.id), "date": TODAY, "status": "absent"}]}).get_json()["data"][0]

    assert client.post(f"{ATT}/staff/{rec['id']}/correct", headers=admin,
                       json={"status": "present", "reason": "x"}).status_code == 422
    res = client.post(f"{ATT}/staff/{rec['id']}/correct", headers=admin,
                      json={"status": "present", "reason": "Biometric device was offline"})
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["status"] == "present" and data["isCorrected"] and data["previousStatus"] == "absent"
    assert data["correctionReason"] == "Biometric device was offline"


def test_cannot_mark_staff_of_other_school(client, login):
    other = Institution.query.filter_by(code="OTHER-ATT").first()
    if not other:
        other = Institution(code="OTHER-ATT", name="Other Att School", email="o@att.test")
        db.session.add(other)
        db.session.flush()
        db.session.add(User(institution_id=other.id, username="att.other", email="t@att.test",
                            first_name="T", last_name="O", is_active=True))
        db.session.commit()
    foreign = User.query.filter_by(email="t@att.test").one()
    res = client.post(f"{ATT}/staff/batch", headers=login(ADMIN), json={"records": [
        {"teacherId": str(foreign.id), "date": TODAY, "status": "present"}]})
    assert res.status_code == 404
