import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String, Text, Numeric, Boolean, Date, DateTime, UniqueConstraint, CheckConstraint, ForeignKey, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel, TenantModel


class FeeStructure(TenantModel):
    """Institutional fee policy master broken down by class grade and session."""
    __tablename__ = "fee_structures"

    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academic_years.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    class_level_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("class_levels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    term_frequency: Mapped[str] = mapped_column(String(30), default="ANNUAL", nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)

    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")
    class_level: Mapped["ClassLevel"] = relationship("ClassLevel")
    items: Mapped[List["FeeStructureItem"]] = relationship(
        "FeeStructureItem", back_populates="fee_structure", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("institution_id", "academic_year_id", "class_level_id", "name", name="uq_fee_structure_session_class"),
    )


class FeeStructureItem(BaseModel):
    """Line item within a fee structure (e.g. Tuition, Lab, Sports)."""
    __tablename__ = "fee_structure_items"

    fee_structure_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fee_structures.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    fee_head: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    is_optional: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    fee_structure: Mapped["FeeStructure"] = relationship("FeeStructure", back_populates="items")

    __table_args__ = (
        CheckConstraint("amount >= 0", name="chk_fee_item_amount_positive"),
    )


class FeeInvoice(TenantModel):
    """Student billing demand with balance tracking and check constraints."""
    __tablename__ = "fee_invoices"

    invoice_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    fee_structure_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fee_structures.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    adjustment_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    balance_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="UNPAID", nullable=False)
    issue_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)

    student: Mapped["Student"] = relationship("Student")
    fee_structure: Mapped["FeeStructure"] = relationship("FeeStructure")
    items: Mapped[List["FeeInvoiceItem"]] = relationship(
        "FeeInvoiceItem", back_populates="invoice", cascade="all, delete-orphan"
    )
    payments: Mapped[List["FeePayment"]] = relationship(
        "FeePayment", back_populates="invoice", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("institution_id", "invoice_number", name="uq_institution_invoice_number"),
        # Mandatory constraint: Payment cannot exceed remaining invoice balance without approved adjustment
        CheckConstraint("paid_amount <= total_amount + adjustment_amount", name="chk_invoice_paid_not_exceed_total"),
        CheckConstraint("paid_amount >= 0", name="chk_invoice_paid_non_negative"),
        CheckConstraint("total_amount >= 0", name="chk_invoice_total_non_negative"),
        CheckConstraint("discount_amount >= 0", name="chk_invoice_discount_non_negative"),
    )


class FeeInvoiceItem(BaseModel):
    """Line item copy on fee invoice."""
    __tablename__ = "fee_invoice_items"

    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fee_invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    fee_head: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    invoice: Mapped["FeeInvoice"] = relationship("FeeInvoice", back_populates="items")


class FeePayment(BaseModel):
    """Recorded fee remittance receipt."""
    __tablename__ = "fee_payments"

    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fee_invoices.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    payment_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False)  # CASH, CHEQUE, UPI, CARD, ONLINE
    transaction_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="COMPLETED", nullable=False)
    payment_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    recorded_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    receipt_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    invoice: Mapped["FeeInvoice"] = relationship("FeeInvoice", back_populates="payments")
    recorder: Mapped[Optional["User"]] = relationship("User")

    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_payment_positive_amount"),
    )


class FinancialTransaction(TenantModel):
    """Immutable double-entry audit ledger entry."""
    __tablename__ = "financial_transactions"

    payment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fee_payments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    transaction_type: Mapped[str] = mapped_column(String(50), nullable=False)  # FEE_PAYMENT, REFUND, VENDOR_PAYMENT
    category: Mapped[str] = mapped_column(String(50), default="REVENUE", nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    credit_or_debit: Mapped[str] = mapped_column(String(10), nullable=False)  # CREDIT, DEBIT
    description: Mapped[str] = mapped_column(Text, nullable=False)
    entry_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    payment: Mapped[Optional["FeePayment"]] = relationship("FeePayment")

    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_transaction_positive_amount"),
    )


class PaymentGatewayWebhook(BaseModel):
    """Cryptographically verified payment gateway webhook event log."""
    __tablename__ = "payment_gateway_webhooks"

    gateway_provider: Mapped[str] = mapped_column(String(50), nullable=False)  # STRIPE, RAZORPAY
    event_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

