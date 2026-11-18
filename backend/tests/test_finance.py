"""Fees module: invoices, payments, receipts, policy and who may see what."""
from datetime import date
from decimal import Decimal

import pytest

from app.extensions import db
from app.models import FeeInvoice, FinancialTransaction, Institution, Parent, Student, StudentParent, User
from tests.conftest import ADMIN, PARENT, TEACHER

FIN = "/api/v1/finance"


def _school_students():
    inst = Institution.query.filter_by(code="STXAV-DELHI").one()
    return Student.query.filter_by(institution_id=inst.id).order_by(Student.admission_number).all()


def _create_invoice(client, headers, student, **overrides):
    body = {
        "studentId": str(student.id),
        "category": "Tuition",
        "academicYear": "2026-2027",
        "dueDate": "2030-03-31",
        "items": [{"title": "Tuition Fee", "amount": 12000}, {"title": "Lab Fee", "amount": 3000}],
        "discountAmount": 1000,
        "discountReason": "Sibling",
        **overrides,
    }
    return client.post(f"{FIN}/invoices", json=body, headers=headers)


@pytest.fixture
def parent_child_and_other(app):
    """Link the demo parent to exactly one student, and return (linked, unlinked)."""
    students = _school_students()
    parent = Parent.query.join(User, Parent.user_id == User.id).filter(User.email == PARENT).one()
    StudentParent.query.filter_by(parent_id=parent.id).delete()
    db.session.add(StudentParent(parent_id=parent.id, student_id=students[0].id, is_primary_contact=True))
    db.session.commit()
    return students[0], students[1]


def test_admin_creates_invoice_with_totals(client, login):
    student = _school_students()[2]
    res = _create_invoice(client, login(ADMIN), student)
    assert res.status_code == 201, res.get_json()
    inv = res.get_json()["data"]
    assert inv["totalAmount"] == 14000.0
    assert inv["balanceAmount"] == 14000.0
    assert inv["status"] == "unpaid"
    assert [i["title"] for i in inv["items"]] == ["Tuition Fee", "Lab Fee"]
    assert inv["invoiceNo"].startswith("INV-")


@pytest.mark.parametrize("override, field", [
    ({"items": [{"title": "Tuition", "amount": -5}]}, "amount"),
    ({"discountAmount": 999999}, "Discount"),
    ({"category": "Bribe"}, "category"),
    ({"dueDate": "not-a-date"}, "dueDate"),
    ({"items": [{"title": "", "amount": 100}]}, "title"),
])
def test_invoice_validation(client, login, override, field):
    res = _create_invoice(client, login(ADMIN), _school_students()[2], **override)
    assert res.status_code == 422
    assert field.lower() in res.get_json()["error"]["message"].lower()


def test_payment_flow_receipt_and_ledger(client, login):
    h = login(ADMIN)
    inv = _create_invoice(client, h, _school_students()[3]).get_json()["data"]

    over = client.post(f"{FIN}/invoices/{inv['id']}/pay", json={"amount": 999999, "method": "Cash"}, headers=h)
    assert over.status_code == 422

    bad_method = client.post(f"{FIN}/invoices/{inv['id']}/pay", json={"amount": 100, "method": "Bitcoin"}, headers=h)
    assert bad_method.status_code == 422

    pay = client.post(f"{FIN}/invoices/{inv['id']}/pay",
                      json={"amount": 4000, "method": "UPI", "transactionRef": "UPI-123"}, headers=h)
    assert pay.status_code == 201
    data = pay.get_json()["data"]
    assert data["invoice"]["paidAmount"] == 4000.0
    assert data["invoice"]["balanceAmount"] == 10000.0
    assert data["invoice"]["status"] == "partial"
    assert data["previousBalance"] == 14000.0

    receipt = client.get(f"{FIN}/receipts/{data['receiptNo']}", headers=h).get_json()["data"]
    assert receipt["amountPaid"] == 4000.0
    assert receipt["previousBalance"] == 14000.0
    assert receipt["remainingBalance"] == 10000.0
    assert receipt["isDemo"] is False

    full = client.post(f"{FIN}/invoices/{inv['id']}/pay", json={"amount": 10000, "method": "Cash"}, headers=h)
    assert full.get_json()["data"]["invoice"]["status"] == "paid"
    ledger = FinancialTransaction.query.filter(FinancialTransaction.description.contains(inv["invoiceNo"])).all()
    assert sum(t.amount for t in ledger) == Decimal("14000.00")

    payments = client.get(f"{FIN}/payments", headers=h).get_json()["data"]
    assert {p["receiptNo"] for p in payments} >= {data["receiptNo"]}


def test_no_partial_payment_when_disallowed(client, login):
    h = login(ADMIN)
    inv = _create_invoice(client, h, _school_students()[4], allowPartial=False).get_json()["data"]
    res = client.post(f"{FIN}/invoices/{inv['id']}/pay", json={"amount": 100, "method": "Cash"}, headers=h)
    assert res.status_code == 422


def test_parent_sees_only_linked_child_invoices(client, login, parent_child_and_other):
    linked, other = parent_child_and_other
    admin = login(ADMIN)
    mine = _create_invoice(client, admin, linked).get_json()["data"]
    theirs = _create_invoice(client, admin, other).get_json()["data"]
    pay = client.post(f"{FIN}/invoices/{theirs['id']}/pay", json={"amount": 500, "method": "Cash"}, headers=admin)
    their_receipt = pay.get_json()["data"]["receiptNo"]

    h = login(PARENT)
    ids = {i["id"] for i in client.get(f"{FIN}/invoices", headers=h).get_json()["data"]}
    assert mine["id"] in ids and theirs["id"] not in ids
    assert all(i["studentId"] == str(linked.id) for i in client.get(f"{FIN}/invoices", headers=h).get_json()["data"])
    assert client.get(f"{FIN}/invoices/{theirs['id']}", headers=h).status_code == 404
    assert client.get(f"{FIN}/receipts/{their_receipt}", headers=h).status_code == 404
    assert their_receipt not in {p["receiptNo"] for p in client.get(f"{FIN}/payments", headers=h).get_json()["data"]}


def test_parent_and_teacher_cannot_change_money(client, login, parent_child_and_other):
    linked, _ = parent_child_and_other
    inv = _create_invoice(client, login(ADMIN), linked).get_json()["data"]
    for who in (PARENT, TEACHER):
        h = login(who)
        assert client.post(f"{FIN}/invoices/{inv['id']}/pay", json={"amount": 1, "method": "Cash"}, headers=h).status_code == 403
        assert _create_invoice(client, h, linked).status_code == 403
        assert client.put(f"{FIN}/policy", json={"upiId": "evil@upi"}, headers=h).status_code == 403
    assert client.get(f"{FIN}/invoices", headers=login(TEACHER)).status_code == 403


def test_admin_cannot_bill_or_read_other_school(client, login):
    other = Institution.query.filter_by(code="OTHER-FIN").first()
    if not other:
        other = Institution(code="OTHER-FIN", name="Other Fin School", email="o@fin.test")
        db.session.add(other)
        db.session.flush()
        stu = Student(institution_id=other.id, admission_number="OF-1", admission_date=date.today(),
                      date_of_birth=date(2012, 1, 1), gender="MALE")
        db.session.add(stu)
        db.session.flush()
        db.session.add(FeeInvoice(institution_id=other.id, invoice_number="OF-INV-1", student_id=stu.id,
                                  subtotal=100, total_amount=100, balance_amount=100, due_date=date(2030, 1, 1)))
        db.session.commit()
    stu = Student.query.filter_by(institution_id=other.id).first()
    foreign_inv = FeeInvoice.query.filter_by(institution_id=other.id).first()
    h = login(ADMIN)
    assert _create_invoice(client, h, stu).status_code == 404
    assert client.get(f"{FIN}/invoices/{foreign_inv.id}", headers=h).status_code == 404
    assert client.post(f"{FIN}/invoices/{foreign_inv.id}/pay", json={"amount": 1, "method": "Cash"},
                       headers=h).status_code == 404


def test_policy_roundtrip_and_visible_to_parent(client, login):
    h = login(ADMIN)
    res = client.put(f"{FIN}/policy", json={
        "upiId": "school@icici", "allowPartialPayments": False,
        "bankAccountDetails": {"accountName": "St X", "ifscCode": "ICIC0001"}, "unknownKey": "ignored",
    }, headers=h)
    assert res.status_code == 200
    policy = client.get(f"{FIN}/policy", headers=login(PARENT)).get_json()["data"]
    assert policy["upiId"] == "school@icici"
    assert policy["allowPartialPayments"] is False
    assert policy["bankAccountDetails"]["ifscCode"] == "ICIC0001"
    assert "unknownKey" not in policy


def test_fee_structure_create_and_list(client, login):
    h = login(ADMIN)
    res = client.post(f"{FIN}/fee-structures", json={
        "title": "Annual Tuition Test", "className": "Class 10", "academicYear": "2026-2027",
        "category": "Tuition", "term": "Annual", "dueDate": "2027-03-31",
        "items": [{"title": "Tuition", "amount": 40000}, {"title": "Sports", "amount": 2000}],
    }, headers=h)
    assert res.status_code in (201, 409), res.get_json()
    listed = client.get(f"{FIN}/fee-structures", headers=h).get_json()["data"]
    fs = next(f for f in listed if f["title"] == "Annual Tuition Test")
    assert fs["totalAmount"] == 42000.0 and fs["className"] == "Class 10"
