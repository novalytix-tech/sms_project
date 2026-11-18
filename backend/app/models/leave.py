import uuid
from datetime import date, datetime, timezone
from typing import Optional
from sqlalchemy import (
    String, Text, Integer, Date, DateTime, UniqueConstraint, CheckConstraint, ForeignKey, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel, TenantModel


class LeaveCategory(TenantModel):
    """Leave quota classification (Casual, Medical, Maternity, Duty)."""
    __tablename__ = "leave_categories"

    name: Mapped[str] = mapped_column(String(50), nullable=False)
    days_allowed_per_year: Mapped[int] = mapped_column(Integer, default=12, nullable=False)
    applicable_to: Mapped[str] = mapped_column(String(20), default="ALL", nullable=False)  # STAFF, STUDENT, ALL

    __table_args__ = (
        UniqueConstraint("institution_id", "name", name="uq_institution_leave_category"),
    )


class LeaveRequest(TenantModel):
    """Staff or student leave application."""
    __tablename__ = "leave_requests"

    applicant_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    leave_category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("leave_categories.id", ondelete="RESTRICT"),
        nullable=False,
    )
    student_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="SET NULL"),
        nullable=True,
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    attachment_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)

    applicant: Mapped["User"] = relationship("User")
    category: Mapped["LeaveCategory"] = relationship("LeaveCategory")
    student: Mapped[Optional["Student"]] = relationship("Student")
    approval: Mapped[Optional["LeaveApproval"]] = relationship(
        "LeaveApproval", back_populates="leave_request", uselist=False, cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint("start_date <= end_date", name="chk_leave_dates"),
    )


class LeaveApproval(BaseModel):
    """Approval or rejection audit for a leave request."""
    __tablename__ = "leave_approvals"

    leave_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("leave_requests.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    approver_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    decision: Mapped[str] = mapped_column(String(20), nullable=False)  # APPROVED, REJECTED
    decision_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    leave_request: Mapped["LeaveRequest"] = relationship("LeaveRequest", back_populates="approval")
    approver: Mapped["User"] = relationship("User")

