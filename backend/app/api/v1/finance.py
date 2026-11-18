"""Fees & finance.

Visibility:
  - school_admin / super_admin: every invoice in their school
  - parent: invoices of their linked children only
  - student: their own invoices only
  - teacher / supplier: no access
Only administrators create invoices, fee structures, policy, and record payments.
Online payment is not available until a payment gateway with signed webhooks is
integrated; parents see the school's payment instructions instead.
"""
import json
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation

from flask import Blueprint, g, jsonify, request
from sqlalchemy.orm import selectinload

from app.auth import ADMIN, role_required
from app.extensions import db, limiter
from app.models import (
    AcademicYear, ClassLevel, FeeInvoice, FeeInvoiceItem, FeePayment, FeeStructure,
    FeeStructureItem, FinancialTransaction, Institution, InstitutionSetting, Parent,
    Student, StudentParent,
)
from app.utils.errors import APIException
from app.utils.tenant import ensure_same_tenant, get_current_tenant_id

finance_bp = Blueprint("finance", __name__, url_prefix="/finance")

FEE_VIEWERS = ("school_admin", "parent", "student")
CATEGORIES = {"Tuition", "Admission", "Transport", "Library", "Examination", "Hostel",
              "Activity", "Laboratory", "Sports", "Uniform", "Books", "Other"}
PAYMENT_METHODS = {"UPI", "Debit Card", "Credit Card", "Net Banking", "Cash", "Cheque",
                   "Bank Transfer", "Demand Draft"}
TERMS = {"Term 1", "Term 2", "Annual", "Monthly", "One-Time"}
MAX_AMOUNT = Decimal("10000000")  # 1 crore per line / payment: rejects typos and abuse

DEFAULT_POLICY = {
    "academicYear": "",
    "currency": "INR",
    "allowPartialPayments": True,
    "minPartialAmount": 0,
    "gracePeriodDays": 0,
    "lateFeePerDay": 0,
    "maxLateFee": 0,
    "discountPercentageSibling": 0,
    "convenienceFeePercentage": 0,
    "upiId": "",
    "paymentInstructions": "Please pay at the school accounts office. A receipt is issued for every payment.",
    "bankAccountDetails": {"accountName": "", "accountNumber": "", "bankName": "", "ifscCode": "", "branch": ""},
}


def _fail(message, status=422, code="VALIDATION_ERROR"):
    raise APIException(message, status_code=status, error_code=code)


def _money(value, field):
    try:
        amount = Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError, ValueError):
        _fail(f"{field} must be a number.")
    if amount < 0 or amount > MAX_AMOUNT:
        _fail(f"{field} is out of range.")
    return amount


def _date(value, field):
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except (TypeError, ValueError):
        _fail(f"{field} must be a date (YYYY-MM-DD).")


def _text(value, max_len):
    if value in (None, ""):
        return None
    return str(value).strip()[:max_len] or None


# ------------------------------------------------------------- visibility

def _visible_student_ids():
    """None = whole school (admin). Otherwise the set of student ids this user may see."""
    roles = g.roles
    if roles & {"super_admin", "school_admin"}:
        return None
    if "parent" in roles:
        parent = Parent.query.filter_by(user_id=g.user_id).first()
        if not parent:
            return set()
        return {sp.student_id for sp in StudentParent.query.filter_by(parent_id=parent.id)}
    if "student" in roles:
        return {s.id for s in Student.query.filter_by(user_id=g.user_id)}
    return set()


def _invoice_query():
    query = FeeInvoice.query.options(
        selectinload(FeeInvoice.items),
        selectinload(FeeInvoice.payments).selectinload(FeePayment.recorder),
        selectinload(FeeInvoice.student).selectinload(Student.user),
        selectinload(FeeInvoice.student).selectinload(Student.enrollments),
    ).filter(FeeInvoice.is_deleted.is_(False))
    tenant_id = get_current_tenant_id()
    if tenant_id:
        query = query.filter(FeeInvoice.institution_id == tenant_id)
    visible = _visible_student_ids()
    if visible is not None:
        query = query.filter(FeeInvoice.student_id.in_(visible or [uuid.uuid4()]))
    return query


def _get_visible_invoice(invoice_id, lock=False):
    query = _invoice_query().filter(FeeInvoice.id == invoice_id)
    if lock:
        query = query.with_for_update(of=FeeInvoice)
    inv = query.first()
    if not inv:
        _fail("Invoice not found.", 404, "NOT_FOUND")
    return inv


# ------------------------------------------------------------- serializers

def _student_info(student):
    name = student.user.full_name if student and student.user else "Student"
    class_name, section = "", ""
    enrollment = next((e for e in student.enrollments if e.status == "ACTIVE"), None) if student else None
    if enrollment and enrollment.section:
        section = enrollment.section.name
        class_name = enrollment.section.class_level.name if enrollment.section.class_level else ""
    return name, (student.admission_number if student else ""), class_name, section


def _status(inv):
    if inv.balance_amount <= 0:
        return "paid"
    if inv.due_date < date.today():
        return "overdue"
    return "partial" if inv.paid_amount > 0 else "unpaid"


def _payment_json(p, inv, student_name):
    paid_at = p.payment_date or p.created_at
    return {
        "id": str(p.id),
        "receiptNo": p.payment_number,
        "date": paid_at.date().isoformat(),
        "time": paid_at.strftime("%I:%M %p"),
        "amount": float(p.amount),
        "method": p.payment_method,
        "recordedBy": p.recorder.full_name if p.recorder else "School office",
        "transactionRef": p.transaction_reference,
        "remarks": p.remarks,
        "status": "success",
        "studentId": str(inv.student_id),
        "studentName": student_name,
        "invoiceId": str(inv.id),
        "invoiceNo": inv.invoice_number,
        "isDemo": False,
        "channel": "manual_office",
    }


def _invoice_json(inv):
    name, adm_no, class_name, section = _student_info(inv.student)
    return {
        "id": str(inv.id),
        "invoiceNo": inv.invoice_number,
        "studentId": str(inv.student_id),
        "studentName": name,
        "admissionNo": adm_no,
        "className": class_name,
        "section": section,
        "category": inv.category,
        "academicYear": inv.academic_year or "",
        "invoiceDate": inv.issue_date.isoformat(),
        "totalAmount": float(inv.total_amount),
        "paidAmount": float(inv.paid_amount),
        "balanceAmount": float(inv.balance_amount),
        "dueDate": inv.due_date.isoformat(),
        "status": _status(inv),
        "items": [
            {"id": str(i.id), "title": i.fee_head, "category": inv.category, "amount": float(i.amount)}
            for i in inv.items
        ],
        "discountAmount": float(inv.discount_amount),
        "discountReason": inv.discount_reason,
        "notes": inv.notes,
        "allowPartial": inv.allow_partial,
        "payments": [_payment_json(p, inv, name) for p in sorted(inv.payments, key=lambda p: p.created_at)],
        "institutionId": str(inv.institution_id),
    }


def _transaction_json(p, inv):
    base = _payment_json(p, inv, _student_info(inv.student)[0])
    return {
        **base,
        "transactionRef": p.transaction_reference or p.payment_number,
        "admissionNo": inv.student.admission_number if inv.student else "",
        "payerName": base["studentName"],
        "notes": p.remarks,
    }


def _structure_json(fs):
    total = sum((i.amount for i in fs.items), Decimal("0"))
    return {
        "id": str(fs.id),
        "title": fs.name,
        "className": fs.class_level.name if fs.class_level else "",
        "academicYear": fs.academic_year.name if fs.academic_year else "",
        "category": fs.category,
        "term": fs.term_frequency,
        "totalAmount": float(total),
        "items": [
            {"id": str(i.id), "title": i.fee_head, "category": fs.category, "amount": float(i.amount)}
            for i in fs.items
        ],
        "dueDate": fs.due_date.isoformat(),
        "allowPartial": fs.allow_partial,
    }


def _load_policy(tenant_id):
    row = InstitutionSetting.query.filter_by(institution_id=tenant_id, setting_key="fee_policy").first()
    policy = json.loads(json.dumps(DEFAULT_POLICY))
    if row and row.setting_value:
        try:
            stored = json.loads(row.setting_value)
            policy.update({k: v for k, v in stored.items() if k in DEFAULT_POLICY})
        except ValueError:
            pass
    return policy


# ------------------------------------------------------------- invoices

@finance_bp.route("/invoices", methods=["GET"])
@role_required(*FEE_VIEWERS)
def list_invoices():
    query = _invoice_query()
    student_id = request.args.get("student_id")
    if student_id:
        try:
            query = query.filter(FeeInvoice.student_id == uuid.UUID(student_id))
        except ValueError:
            _fail("Invalid student_id.")
    invoices = query.order_by(FeeInvoice.due_date.asc()).limit(5000).all()
    return jsonify({"success": True, "data": [_invoice_json(i) for i in invoices]}), 200


@finance_bp.route("/invoices/<uuid:invoice_id>", methods=["GET"])
@role_required(*FEE_VIEWERS)
def get_invoice(invoice_id):
    return jsonify({"success": True, "data": _invoice_json(_get_visible_invoice(invoice_id))}), 200


@finance_bp.route("/invoices", methods=["POST"])
@role_required(*ADMIN)
def create_invoice():
    tenant_id = get_current_tenant_id(required=True)
    data = request.get_json(silent=True) or {}

    try:
        student = db.session.get(Student, uuid.UUID(str(data.get("studentId"))))
    except ValueError:
        student = None
    if not student or student.is_deleted:
        _fail("Student not found.", 404, "NOT_FOUND")
    ensure_same_tenant(student.institution_id)

    category = data.get("category") or "Tuition"
    if category not in CATEGORIES:
        _fail("Invalid fee category.")
    due = _date(data.get("dueDate"), "dueDate")

    raw_items = data.get("items") or [{"title": f"{category} Fee", "amount": data.get("totalAmount")}]
    if not isinstance(raw_items, list) or not 1 <= len(raw_items) <= 50:
        _fail("Provide between 1 and 50 fee items.")
    items = []
    for item in raw_items:
        title = _text(item.get("title"), 100)
        if not title:
            _fail("Every fee item needs a title.")
        items.append((title, _money(item.get("amount"), "Item amount")))
    subtotal = sum((a for _, a in items), Decimal("0"))
    discount = _money(data.get("discountAmount") or 0, "discountAmount")
    if discount > subtotal:
        _fail("Discount cannot exceed the invoice amount.")
    total = subtotal - discount
    if total <= 0:
        _fail("Invoice total must be greater than zero.")

    fee_structure_id = None
    if data.get("feeStructureId"):
        fs = db.session.get(FeeStructure, uuid.UUID(str(data["feeStructureId"])))
        if not fs:
            _fail("Fee structure not found.", 404, "NOT_FOUND")
        ensure_same_tenant(fs.institution_id)
        fee_structure_id = fs.id

    inv = FeeInvoice(
        institution_id=tenant_id,
        invoice_number=f"INV-{date.today().year}-{uuid.uuid4().hex[:8].upper()}",
        student_id=student.id,
        fee_structure_id=fee_structure_id,
        category=category,
        academic_year=_text(data.get("academicYear"), 20),
        discount_reason=_text(data.get("discountReason"), 255),
        notes=_text(data.get("notes"), 2000),
        allow_partial=bool(data.get("allowPartial", True)),
        subtotal=subtotal,
        discount_amount=discount,
        total_amount=total,
        paid_amount=Decimal("0"),
        balance_amount=total,
        status="UNPAID",
        issue_date=date.today(),
        due_date=due,
    )
    db.session.add(inv)
    db.session.flush()
    for title, amount in items:
        db.session.add(FeeInvoiceItem(invoice_id=inv.id, fee_head=title, amount=amount))
    db.session.commit()
    return jsonify({"success": True, "data": _invoice_json(_get_visible_invoice(inv.id))}), 201


@finance_bp.route("/invoices/<uuid:invoice_id>/pay", methods=["POST"])
@role_required(*ADMIN)
@limiter.limit("120 per minute")
def record_invoice_payment(invoice_id):
    """Record a payment received at the school office (cash, cheque, UPI to school account…)."""
    inv = _get_visible_invoice(invoice_id, lock=True)
    data = request.get_json(silent=True) or {}

    amount = _money(data.get("amount"), "amount")
    if amount <= 0:
        _fail("Payment amount must be greater than zero.")
    if amount > inv.balance_amount:
        _fail(f"Payment cannot exceed the remaining balance of {inv.balance_amount}.")
    if not inv.allow_partial and amount < inv.balance_amount:
        _fail("Partial payments are not allowed for this invoice.")

    method = data.get("method") or data.get("payment_method") or "Cash"
    if method not in PAYMENT_METHODS:
        _fail("Invalid payment method.")

    previous_balance = inv.balance_amount
    payment = FeePayment(
        invoice_id=inv.id,
        payment_number=f"REC-{date.today().year}-{uuid.uuid4().hex[:8].upper()}",
        amount=amount,
        payment_method=method,
        transaction_reference=_text(data.get("transactionRef") or data.get("transaction_reference"), 100),
        remarks=_text(data.get("remarks"), 1000),
        status="COMPLETED",
        payment_date=datetime.now(timezone.utc),
        recorded_by=g.user_id,
    )
    db.session.add(payment)
    db.session.flush()

    inv.paid_amount += amount
    inv.balance_amount -= amount
    inv.status = "PAID" if inv.balance_amount == 0 else "PARTIALLY_PAID"

    db.session.add(FinancialTransaction(
        institution_id=inv.institution_id,
        payment_id=payment.id,
        transaction_type="FEE_PAYMENT",
        category="REVENUE",
        amount=amount,
        credit_or_debit="CREDIT",
        description=f"Fee collection for {inv.invoice_number} via {method}",
    ))
    db.session.commit()

    inv = _get_visible_invoice(inv.id)
    return jsonify({
        "success": True,
        "data": {
            "invoice": _invoice_json(inv),
            "receiptNo": payment.payment_number,
            "previousBalance": float(previous_balance),
        },
    }), 201


# ------------------------------------------------------------- payments & receipts

@finance_bp.route("/payments", methods=["GET"])
@role_required(*FEE_VIEWERS)
def list_payments():
    invoice_ids = _invoice_query().with_entities(FeeInvoice.id)
    payments = (
        FeePayment.query.options(
            selectinload(FeePayment.recorder),
            selectinload(FeePayment.invoice).selectinload(FeeInvoice.student).selectinload(Student.user),
        )
        .filter(FeePayment.invoice_id.in_(invoice_ids))
        .order_by(FeePayment.created_at.desc())
        .limit(5000)
        .all()
    )
    return jsonify({"success": True, "data": [_transaction_json(p, p.invoice) for p in payments]}), 200


@finance_bp.route("/receipts/<receipt_no>", methods=["GET"])
@role_required(*FEE_VIEWERS)
def get_receipt(receipt_no):
    payment = FeePayment.query.filter_by(payment_number=str(receipt_no)[:50]).first()
    if not payment:
        _fail("Receipt not found.", 404, "NOT_FOUND")
    inv = _get_visible_invoice(payment.invoice_id)  # enforces tenant + parent/student scope

    paid_before = sum((p.amount for p in inv.payments if p.created_at < payment.created_at), Decimal("0"))
    previous_balance = inv.total_amount - paid_before
    name, adm_no, class_name, section = _student_info(inv.student)
    school = db.session.get(Institution, inv.institution_id)
    paid_at = payment.payment_date or payment.created_at
    address = ", ".join(x for x in [school.address, school.city, school.state, school.postal_code] if x)
    return jsonify({"success": True, "data": {
        "receiptNo": payment.payment_number,
        "transactionRef": payment.transaction_reference or payment.payment_number,
        "invoiceNo": inv.invoice_number,
        "invoiceId": str(inv.id),
        "studentId": str(inv.student_id),
        "studentName": name,
        "admissionNo": adm_no,
        "className": class_name,
        "section": section,
        "academicYear": inv.academic_year or "",
        "category": inv.category,
        "amountPaid": float(payment.amount),
        "previousBalance": float(previous_balance),
        "remainingBalance": float(previous_balance - payment.amount),
        "paymentDate": paid_at.date().isoformat(),
        "paymentTime": paid_at.strftime("%I:%M %p"),
        "paymentMethod": payment.payment_method,
        "status": "success",
        "isDemo": False,
        "recordedBy": payment.recorder.full_name if payment.recorder else "School office",
        "schoolName": school.name,
        "schoolAddress": address,
        "schoolAffiliation": " • ".join(x for x in [
            f"Affiliation No: {school.affiliation_number}" if school.affiliation_number else "",
            f"Board: {school.board_affiliation}" if school.board_affiliation else "",
        ] if x),
    }}), 200


# ------------------------------------------------------------- policy

@finance_bp.route("/policy", methods=["GET"])
@role_required(*FEE_VIEWERS)
def get_policy():
    return jsonify({"success": True, "data": _load_policy(get_current_tenant_id(required=True))}), 200


@finance_bp.route("/policy", methods=["PUT"])
@role_required(*ADMIN)
def update_policy():
    tenant_id = get_current_tenant_id(required=True)
    data = request.get_json(silent=True) or {}
    policy = _load_policy(tenant_id)

    for key in ("allowPartialPayments",):
        if key in data:
            policy[key] = bool(data[key])
    for key in ("minPartialAmount", "gracePeriodDays", "lateFeePerDay", "maxLateFee",
                "discountPercentageSibling", "convenienceFeePercentage"):
        if key in data:
            policy[key] = float(_money(data[key], key))
    for key, n in (("academicYear", 20), ("currency", 10), ("upiId", 100), ("paymentInstructions", 2000)):
        if key in data:
            policy[key] = _text(data[key], n) or ""
    if isinstance(data.get("bankAccountDetails"), dict):
        bank = data["bankAccountDetails"]
        policy["bankAccountDetails"] = {
            k: _text(bank.get(k), 100) or "" for k in DEFAULT_POLICY["bankAccountDetails"]
        }

    row = InstitutionSetting.query.filter_by(institution_id=tenant_id, setting_key="fee_policy").first()
    if not row:
        row = InstitutionSetting(institution_id=tenant_id, category="FINANCE", setting_key="fee_policy", data_type="JSON")
        db.session.add(row)
    row.setting_value = json.dumps(policy)
    db.session.commit()
    return jsonify({"success": True, "data": policy}), 200


# ------------------------------------------------------------- fee structures

@finance_bp.route("/fee-structures", methods=["GET"])
@role_required(*ADMIN)
def list_fee_structures():
    query = FeeStructure.query.options(
        selectinload(FeeStructure.items), selectinload(FeeStructure.class_level), selectinload(FeeStructure.academic_year)
    )
    tenant_id = get_current_tenant_id()
    if tenant_id:
        query = query.filter(FeeStructure.institution_id == tenant_id)
    return jsonify({"success": True, "data": [_structure_json(fs) for fs in query.all()]}), 200


@finance_bp.route("/fee-structures", methods=["POST"])
@role_required(*ADMIN)
def create_fee_structure():
    tenant_id = get_current_tenant_id(required=True)
    data = request.get_json(silent=True) or {}

    title = _text(data.get("title") or data.get("name"), 100)
    if not title:
        _fail("title is required.")
    category = data.get("category") or "Tuition"
    if category not in CATEGORIES:
        _fail("Invalid fee category.")
    term = data.get("term") or "Annual"
    if term not in TERMS:
        _fail("Invalid term.")

    if data.get("class_level_id"):
        class_level = ClassLevel.query.filter_by(id=uuid.UUID(str(data["class_level_id"])), institution_id=tenant_id).first()
    else:
        class_level = ClassLevel.query.filter_by(name=_text(data.get("className"), 100), institution_id=tenant_id).first()
    if not class_level:
        _fail("Class not found in this school.", 404, "NOT_FOUND")

    if data.get("academic_year_id"):
        year = AcademicYear.query.filter_by(id=uuid.UUID(str(data["academic_year_id"])), institution_id=tenant_id).first()
    elif data.get("academicYear"):
        year = AcademicYear.query.filter_by(name=_text(data.get("academicYear"), 50), institution_id=tenant_id).first()
    else:
        year = AcademicYear.query.filter_by(institution_id=tenant_id, is_current=True).first()
    if not year:
        _fail("Academic year not found in this school.", 404, "NOT_FOUND")

    raw_items = data.get("items") or []
    if not isinstance(raw_items, list) or not 1 <= len(raw_items) <= 50:
        _fail("Provide between 1 and 50 fee items.")

    if FeeStructure.query.filter_by(institution_id=tenant_id, academic_year_id=year.id,
                                    class_level_id=class_level.id, name=title).first():
        _fail("A fee structure with this title already exists for this class and year.", 409, "CONFLICT")

    fs = FeeStructure(
        institution_id=tenant_id,
        academic_year_id=year.id,
        class_level_id=class_level.id,
        name=title,
        term_frequency=term,
        category=category,
        allow_partial=bool(data.get("allowPartial", True)),
        due_date=_date(data.get("dueDate") or data.get("due_date"), "dueDate"),
    )
    db.session.add(fs)
    db.session.flush()
    for item in raw_items:
        item_title = _text(item.get("title") or item.get("fee_head"), 100)
        if not item_title:
            _fail("Every fee item needs a title.")
        db.session.add(FeeStructureItem(
            fee_structure_id=fs.id,
            fee_head=item_title,
            amount=_money(item.get("amount"), "Item amount"),
            is_optional=bool(item.get("is_optional", False)),
        ))
    db.session.commit()
    return jsonify({"success": True, "data": _structure_json(fs)}), 201


# ------------------------------------------------------------- summary

@finance_bp.route("/summary", methods=["GET"])
@role_required(*ADMIN)
def get_finance_summary():
    invoices = _invoice_query().all()
    billed = sum((i.total_amount for i in invoices), Decimal("0"))
    collected = sum((i.paid_amount for i in invoices), Decimal("0"))
    return jsonify({"success": True, "data": {
        "total_billed": float(billed),
        "total_collected": float(collected),
        "total_outstanding": float(billed - collected),
        "overdue_invoices_count": sum(1 for i in invoices if _status(i) == "overdue"),
        "collection_rate": round(float(collected / billed * 100), 1) if billed > 0 else 0.0,
    }}), 200
