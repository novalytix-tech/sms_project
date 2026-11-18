import uuid
from datetime import date, datetime
from decimal import Decimal
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import (
    FeeStructure, FeeStructureItem, FeeInvoice, FeeInvoiceItem,
    FeePayment, FinancialTransaction, Student, AcademicYear, ClassLevel
)
from app.utils.tenant import get_current_tenant_id
from app.utils.errors import APIException

finance_bp = Blueprint("finance", __name__, url_prefix="/finance")


def _serialize_invoice(inv: FeeInvoice):
    student_name = "Student"
    adm_no = ""
    if inv.student:
        adm_no = inv.student.admission_number
        if inv.student.user:
            student_name = f"{inv.student.user.first_name} {inv.student.user.last_name}".strip()

    return {
        "id": str(inv.id),
        "invoice_number": inv.invoice_number,
        "student_id": str(inv.student_id),
        "student_name": student_name,
        "admission_number": adm_no,
        "fee_structure_id": str(inv.fee_structure_id),
        "fee_structure_name": inv.fee_structure.name if inv.fee_structure else None,
        "subtotal": float(inv.subtotal),
        "discount_amount": float(inv.discount_amount),
        "total_amount": float(inv.total_amount),
        "paid_amount": float(inv.paid_amount),
        "balance_amount": float(inv.balance_amount),
        "status": inv.status,
        "issue_date": inv.issue_date.isoformat(),
        "due_date": inv.due_date.isoformat(),
        "items": [
            {
                "id": str(item.id),
                "fee_head": item.fee_head,
                "amount": float(item.amount),
            }
            for item in inv.items
        ],
        "payments": [
            {
                "id": str(p.id),
                "payment_number": p.payment_number,
                "amount": float(p.amount),
                "payment_method": p.payment_method,
                "payment_date": p.created_at.isoformat() if p.created_at else None,
            }
            for p in inv.payments
        ]
    }


# -------------------------------------------------------------
# 1. Fee Structures
# -------------------------------------------------------------

@finance_bp.route("/fee-structures", methods=["GET"])
def list_fee_structures():
    institution_id = get_current_tenant_id()
    query = FeeStructure.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    structures = query.all()
    data = [
        {
            "id": str(fs.id),
            "name": fs.name,
            "academic_year_id": str(fs.academic_year_id),
            "academic_year_name": fs.academic_year.name if fs.academic_year else None,
            "class_level_id": str(fs.class_level_id),
            "class_name": fs.class_level.name if fs.class_level else None,
            "term_frequency": fs.term_frequency,
            "due_date": fs.due_date.isoformat(),
            "total_fee": float(sum(item.amount for item in fs.items)),
            "items": [
                {
                    "id": str(item.id),
                    "fee_head": item.fee_head,
                    "amount": float(item.amount),
                    "is_optional": item.is_optional,
                }
                for item in fs.items
            ]
        }
        for fs in structures
    ]
    return jsonify({"success": True, "data": data}), 200


@finance_bp.route("/fee-structures", methods=["POST"])
def create_fee_structure():
    institution_id = get_current_tenant_id(required=True)
    payload = request.get_json() or {}

    name = payload.get("name")
    academic_year_id = payload.get("academic_year_id")
    class_level_id = payload.get("class_level_id")

    if not name or not academic_year_id or not class_level_id:
        raise APIException("name, academic_year_id, and class_level_id are required", status_code=400)

    # Idempotent check
    existing = FeeStructure.query.filter_by(
        institution_id=institution_id,
        academic_year_id=uuid.UUID(str(academic_year_id)),
        class_level_id=uuid.UUID(str(class_level_id)),
        name=name.strip()
    ).first()
    if existing:
        return jsonify({
            "success": True,
            "data": {"id": str(existing.id), "name": existing.name},
            "message": f"Fee structure '{existing.name}' retrieved."
        }), 200

    due_date = payload.get("due_date")
    d_date = datetime.strptime(str(due_date)[:10], "%Y-%m-%d").date() if due_date else date(2026, 12, 31)

    fs = FeeStructure(
        institution_id=institution_id,
        academic_year_id=uuid.UUID(str(academic_year_id)),
        class_level_id=uuid.UUID(str(class_level_id)),
        name=name.strip(),
        term_frequency=payload.get("term_frequency", "ANNUAL").upper(),
        due_date=d_date,
    )
    db.session.add(fs)
    db.session.flush()

    items = payload.get("items") or [{"fee_head": "Tuition Fee", "amount": 10000.0, "is_optional": False}]
    for item in items:
        fsi = FeeStructureItem(
            fee_structure_id=fs.id,
            fee_head=item.get("fee_head", "Tuition Fee"),
            amount=Decimal(str(item.get("amount", 10000.0))),
            is_optional=item.get("is_optional", False),
        )
        db.session.add(fsi)

    db.session.commit()

    return jsonify({
        "success": True,
        "data": {"id": str(fs.id), "name": fs.name},
        "message": f"Fee structure '{fs.name}' created successfully."
    }), 201


# -------------------------------------------------------------
# 2. Invoices
# -------------------------------------------------------------

@finance_bp.route("/invoices", methods=["GET"])
def list_invoices():
    institution_id = get_current_tenant_id()
    query = FeeInvoice.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    student_id = request.args.get("student_id")
    if student_id:
        query = query.filter_by(student_id=uuid.UUID(student_id))

    status = request.args.get("status")
    if status:
        query = query.filter_by(status=status.upper())

    invoices = query.order_by(FeeInvoice.due_date.asc()).all()
    return jsonify({
        "success": True,
        "data": [_serialize_invoice(inv) for inv in invoices]
    }), 200


@finance_bp.route("/invoices/<uuid:invoice_id>", methods=["GET"])
def get_invoice(invoice_id):
    inv = FeeInvoice.query.filter_by(id=invoice_id).first()
    if not inv:
        raise APIException("Invoice not found", status_code=404)

    return jsonify({"success": True, "data": _serialize_invoice(inv)}), 200


@finance_bp.route("/invoices/<uuid:invoice_id>/pay", methods=["POST"])
def record_invoice_payment(invoice_id):
    """Process a payment against an invoice and record ledger transaction."""
    inv = FeeInvoice.query.filter_by(id=invoice_id).first()
    if not inv:
        raise APIException("Invoice not found", status_code=404)

    payload = request.get_json() or {}
    raw_amount = payload.get("amount")
    if not raw_amount:
        raise APIException("Payment amount is required", status_code=400)

    payment_amt = Decimal(str(raw_amount))
    if payment_amt <= 0:
        raise APIException("Payment amount must be greater than zero", status_code=400)

    if payment_amt > inv.balance_amount:
        raise APIException(f"Payment amount ({payment_amt}) cannot exceed remaining balance ({inv.balance_amount})", status_code=400)

    method = payload.get("payment_method", "CASH").upper()
    pay_no = f"PAY-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    # 1. Create Payment
    payment = FeePayment(
        invoice_id=inv.id,
        payment_number=pay_no,
        amount=payment_amt,
        payment_method=method,
        transaction_reference=payload.get("transaction_reference"),
    )
    db.session.add(payment)

    # 2. Update Invoice
    inv.paid_amount += payment_amt
    inv.balance_amount -= payment_amt
    if inv.balance_amount == 0:
        inv.status = "PAID"
    else:
        inv.status = "PARTIALLY_PAID"

    # 3. Create General Ledger Transaction
    tx = FinancialTransaction(
        institution_id=inv.institution_id,
        payment_id=payment.id,
        transaction_type="FEE_PAYMENT",
        category="REVENUE",
        amount=payment_amt,
        credit_or_debit="CREDIT",
        description=f"Fee collection for {inv.invoice_number} via {method}",
    )
    db.session.add(tx)

    db.session.commit()

    return jsonify({
        "success": True,
        "data": {
            "payment_id": str(payment.id),
            "payment_number": payment.payment_number,
            "invoice_status": inv.status,
            "paid_amount": float(inv.paid_amount),
            "remaining_balance": float(inv.balance_amount),
        },
        "message": f"Payment of {payment_amt} recorded successfully."
    }), 201


# -------------------------------------------------------------
# 3. Financial Summary
# -------------------------------------------------------------

@finance_bp.route("/summary", methods=["GET"])
def get_finance_summary():
    institution_id = get_current_tenant_id()
    query = FeeInvoice.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    invoices = query.all()
    total_billed = sum(i.total_amount for i in invoices)
    total_collected = sum(i.paid_amount for i in invoices)
    total_outstanding = sum(i.balance_amount for i in invoices)
    overdue_count = sum(1 for i in invoices if i.status != "PAID" and i.due_date < date.today())

    return jsonify({
        "success": True,
        "data": {
            "total_billed": float(total_billed),
            "total_collected": float(total_collected),
            "total_outstanding": float(total_outstanding),
            "overdue_invoices_count": overdue_count,
            "collection_rate": round(float(total_collected / total_billed * 100), 1) if total_billed > 0 else 0.0,
        }
    }), 200

