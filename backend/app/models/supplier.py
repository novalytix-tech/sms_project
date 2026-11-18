import uuid
from datetime import date
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String, Text, Integer, Numeric, Date, UniqueConstraint, CheckConstraint, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel, TenantModel


class Supplier(BaseModel):
    """Vendor master directory operating across multiple institutions."""
    __tablename__ = "suppliers"

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    vendor_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_person: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    gstin: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    category: Mapped[str] = mapped_column(String(100), default="BOOKS_AND_STATIONERY", nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)

    user: Mapped[Optional["User"]] = relationship("User")
    institution_contracts: Mapped[List["SupplierInstitution"]] = relationship(
        "SupplierInstitution", back_populates="supplier", cascade="all, delete-orphan"
    )


class SupplierInstitution(BaseModel):
    """Multi-institution vendor contract terms."""
    __tablename__ = "supplier_institutions"

    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    contract_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    payment_terms_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)

    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="institution_contracts")
    institution: Mapped["Institution"] = relationship("Institution")

    __table_args__ = (
        UniqueConstraint("supplier_id", "institution_id", name="uq_supplier_institution"),
    )


class PurchaseOrder(TenantModel):
    """Procurement requisition and delivery tracking."""
    __tablename__ = "purchase_orders"

    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    order_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    order_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    expected_delivery_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_delivery_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)  # PENDING, DELIVERED
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    supplier: Mapped["Supplier"] = relationship("Supplier")
    creator: Mapped["User"] = relationship("User")
    items: Mapped[List["PurchaseOrderItem"]] = relationship(
        "PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("institution_id", "order_number", name="uq_institution_purchase_order_number"),
    )


class PurchaseOrderItem(BaseModel):
    """Itemized procurement line."""
    __tablename__ = "purchase_order_items"

    purchase_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchase_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_description: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    purchase_order: Mapped["PurchaseOrder"] = relationship("PurchaseOrder", back_populates="items")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="chk_purchase_item_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="chk_purchase_item_unit_price_positive"),
    )

