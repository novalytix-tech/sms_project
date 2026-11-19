"""Examinations: exams per section, papers, marks entry rules and visibility."""
import uuid

import pytest

from app.extensions import db
from app.models import Institution, Parent, StudentEnrollment, StudentParent, User
from tests.conftest import ADMIN, PARENT, TEACHER

EX = "/api/v1/examinations"


def _sections():
    inst = Institution.query.filter_by(code="STXAV-DELHI").one()
    teacher = User.query.filter_by(email=TEACHER).one()
    secs = {e.section.id: e.section for e in StudentEnrollment.query.filter_by(status="ACTIVE")
            if e.section and e.section.class_level.institution_id == inst.id}.values()
    own = next(s for s in secs if s.class_teacher_id == teacher.id)
    other = next(s for s in secs if s.id != own.id and s.class_teacher_id != teacher.id)
    return own, other


def _students(section):
    return [e.student_id for e in StudentEnrollment.query.filter_by(section_id=section.id, status="ACTIVE")]


def _exam(client, h, section, title=None, **extra):
    body = {"title": title or f"Mid-Term {uuid.uuid4().hex[:6]}", "examType": "Mid-Term",
            "classId": str(section.id), "academicYear": "2026-2027",
            "startDate": "2026-12-01", "endDate": "2026-12-10", "status": "upcoming", **extra}
    return client.post(f"{EX}/exams", json=body, headers=h)


def _paper(client, h, exam_id, subject="Mathematics", **extra):
    body = {"subject": subject, "date": "2026-12-02", "startTime": "09:00", "endTime": "12:00",
            "maxMarks": 80, "passMarks": 27, "roomNo": "Hall 1", **extra}
    return client.post(f"{EX}/exams/{exam_id}/schedules", json=body, headers=h)


@pytest.fixture
def exam_with_paper(client, login):
    own, other = _sections()
    h = login(ADMIN)
    exam = _exam(client, h, own).get_json()["data"]
    exam = _paper(client, h, exam["id"]).get_json()["data"]
    return exam, exam["schedules"][0], own, other


def test_admin_creates_exam_and_paper(client, login):
    own, _ = _sections()
    h = login(ADMIN)
    res = _exam(client, h, own, title="Unique Exam Title")
    assert res.status_code == 201, res.get_json()
    exam = res.get_json()["data"]
    assert exam["classId"] == str(own.id) and exam["status"] == "upcoming" and exam["schedules"] == []
    assert _exam(client, h, own, title="Unique Exam Title").status_code == 409

    paper = _paper(client, h, exam["id"], subject="Robotics Elective")  # new subject is created
    assert paper.status_code == 201
    sch = paper.get_json()["data"]["schedules"][0]
    assert sch["subject"] == "Robotics Elective" and sch["maxMarks"] == 80 and sch["roomNo"] == "Hall 1"
    assert _paper(client, h, exam["id"], subject="robotics elective").status_code == 409


@pytest.mark.parametrize("extra", [
    {"date": "2027-01-01"},                    # outside exam window
    {"startTime": "12:00", "endTime": "09:00"},
    {"passMarks": 90},                         # above max marks
])
def test_paper_validation(client, login, extra):
    own, _ = _sections()
    h = login(ADMIN)
    exam = _exam(client, h, own).get_json()["data"]
    assert _paper(client, h, exam["id"], **extra).status_code == 422


def test_exam_dates_validated(client, login):
    own, _ = _sections()
    res = _exam(client, login(ADMIN), own, startDate="2026-12-10", endDate="2026-12-01")
    assert res.status_code == 422


def test_teacher_enters_marks_for_own_class_only(client, login, exam_with_paper):
    exam, paper, own, other = exam_with_paper
    h = login(TEACHER)
    s1 = _students(own)[0]
    res = client.post(f"{EX}/marks/batch", headers=h, json={
        "examId": exam["id"], "scheduleId": paper["id"],
        "records": [{"studentId": str(s1), "marksObtained": 72.5, "remarks": "Good"}]})
    assert res.status_code == 200, res.get_json()
    marks = client.get(f"{EX}/marks?exam_id={exam['id']}", headers=h).get_json()["data"]
    assert marks[0]["marksObtained"] == 72.5 and marks[0]["studentId"] == str(s1)

    other_exam = _paper(client, login(ADMIN), _exam(client, login(ADMIN), other).get_json()["data"]["id"]).get_json()["data"]
    res = client.post(f"{EX}/marks/batch", headers=h, json={
        "examId": other_exam["id"], "scheduleId": other_exam["schedules"][0]["id"],
        "records": [{"studentId": str(_students(other)[0]), "marksObtained": 50}]})
    assert res.status_code == 404  # teachers cannot even see other sections' exams
    assert other_exam["id"] not in {e["id"] for e in client.get(f"{EX}/exams", headers=h).get_json()["data"]}


def test_marks_validation_and_absent(client, login, exam_with_paper):
    exam, paper, own, other = exam_with_paper
    h = login(ADMIN)
    base = {"examId": exam["id"], "scheduleId": paper["id"]}
    s1 = _students(own)[0]
    over = client.post(f"{EX}/marks/batch", headers=h, json={**base, "records": [{"studentId": str(s1), "marksObtained": 81}]})
    assert over.status_code == 422  # above the paper's max marks (80)
    stranger = client.post(f"{EX}/marks/batch", headers=h, json={**base, "records": [{"studentId": str(_students(other)[0]), "marksObtained": 10}]})
    assert stranger.status_code == 422
    ok = client.post(f"{EX}/marks/batch", headers=h, json={**base, "records": [{"studentId": str(s1), "marksObtained": 55, "isAbsent": True}]})
    assert ok.status_code == 200
    mark = client.get(f"{EX}/marks?exam_id={exam['id']}&student_id={s1}", headers=h).get_json()["data"][0]
    assert mark["isAbsent"] is True and mark["marksObtained"] == 0.0


def test_parent_sees_only_child_marks_and_cannot_write(client, login, exam_with_paper):
    exam, paper, own, _ = exam_with_paper
    child, classmate = _students(own)[0], _students(own)[1]
    parent = Parent.query.join(User, Parent.user_id == User.id).filter(User.email == PARENT).one()
    StudentParent.query.filter_by(parent_id=parent.id).delete()
    db.session.add(StudentParent(parent_id=parent.id, student_id=child, is_primary_contact=True))
    db.session.commit()

    client.post(f"{EX}/marks/batch", headers=login(ADMIN), json={
        "examId": exam["id"], "scheduleId": paper["id"],
        "records": [{"studentId": str(child), "marksObtained": 60}, {"studentId": str(classmate), "marksObtained": 40}]})

    h = login(PARENT)
    assert exam["id"] in {e["id"] for e in client.get(f"{EX}/exams", headers=h).get_json()["data"]}
    marks = client.get(f"{EX}/marks?exam_id={exam['id']}", headers=h).get_json()["data"]
    assert {m["studentId"] for m in marks} == {str(child)}
    assert client.post(f"{EX}/marks/batch", headers=h, json={
        "examId": exam["id"], "scheduleId": paper["id"],
        "records": [{"studentId": str(child), "marksObtained": 80}]}).status_code == 403
    assert _exam(client, h, own).status_code == 403


def test_exam_with_marks_cannot_be_deleted(client, login, exam_with_paper):
    exam, paper, own, _ = exam_with_paper
    h = login(ADMIN)
    client.post(f"{EX}/marks/batch", headers=h, json={
        "examId": exam["id"], "scheduleId": paper["id"],
        "records": [{"studentId": str(_students(own)[0]), "marksObtained": 50}]})
    assert client.delete(f"{EX}/exams/{exam['id']}", headers=h).status_code == 409
    empty = _exam(client, h, own).get_json()["data"]
    assert client.delete(f"{EX}/exams/{empty['id']}", headers=h).status_code == 200
    assert client.delete(f"{EX}/exams/{exam['id']}", headers=login(TEACHER)).status_code == 403
