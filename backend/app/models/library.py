import uuid
from datetime import date
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String, Text, Boolean, Integer, Numeric, Date, UniqueConstraint, CheckConstraint, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel, TenantModel


class Book(TenantModel):
    """Library book catalog title master."""
    __tablename__ = "books"

    isbn: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    author: Mapped[str] = mapped_column(String(255), nullable=False)
    publisher: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    edition: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    category: Mapped[str] = mapped_column(String(100), default="GENERAL", nullable=False)
    total_copies: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    available_copies: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    copies: Mapped[List["BookCopy"]] = relationship("BookCopy", back_populates="book", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("institution_id", "isbn", name="uq_institution_book_isbn"),
        CheckConstraint("available_copies <= total_copies", name="chk_book_available_copies"),
        CheckConstraint("total_copies >= 0", name="chk_book_total_copies_non_negative"),
    )


class BookCopy(BaseModel):
    """Physical accession copy identified by barcode and accession register number."""
    __tablename__ = "book_copies"

    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("books.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    barcode: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    accession_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    condition: Mapped[str] = mapped_column(String(20), default="NEW", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="AVAILABLE", nullable=False)  # AVAILABLE, ISSUED, MAINTENANCE

    book: Mapped["Book"] = relationship("Book", back_populates="copies")
    loans: Mapped[List["BookLoan"]] = relationship("BookLoan", back_populates="copy", cascade="all, delete-orphan")


class BookLoan(BaseModel):
    """Circulation checkout log with active loan collision guard."""
    __tablename__ = "book_loans"

    copy_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("book_copies.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    borrower_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    issue_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    return_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ISSUED", nullable=False)  # ISSUED, RETURNED, OVERDUE, LOST
    issued_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    copy: Mapped["BookCopy"] = relationship("BookCopy", back_populates="loans")
    borrower: Mapped["User"] = relationship("User", foreign_keys=[borrower_user_id])
    issuer: Mapped["User"] = relationship("User", foreign_keys=[issued_by])
    fine: Mapped[Optional["LibraryFine"]] = relationship(
        "LibraryFine", back_populates="loan", uselist=False, cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint("issue_date <= due_date", name="chk_loan_dates"),
        # Mandatory constraint: A copy cannot be simultaneously issued to two active loans
        Index("uq_active_copy_loan", "copy_id", unique=True, postgresql_where=(status == "ISSUED")),
    )


class LibraryFine(BaseModel):
    """Overdue late fee or damage penalty."""
    __tablename__ = "library_fines"

    loan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("book_loans.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    paid_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    collected_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    loan: Mapped["BookLoan"] = relationship("BookLoan", back_populates="fine")
    collector: Mapped[Optional["User"]] = relationship("User")

    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_fine_amount_positive"),
    )


class LibraryStockAudit(TenantModel):
    """Stocktaking physical audit register."""
    __tablename__ = "library_stock_audits"

    audit_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    audited_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    total_verified: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    discrepancy_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    auditor: Mapped["User"] = relationship("User")

