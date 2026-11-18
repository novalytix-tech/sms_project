import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import String, Text, Numeric, Date, DateTime, UniqueConstraint, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel


class Assignment(BaseModel):
    """Homework or class assignment created by faculty."""
    __tablename__ = "assignments"

    class_subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("class_subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attachment_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    assigned_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    max_marks: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("100.00"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PUBLISHED", nullable=False)

    class_subject: Mapped["ClassSubject"] = relationship("ClassSubject")
    teacher: Mapped["User"] = relationship("User")
    submissions: Mapped[List["AssignmentSubmission"]] = relationship(
        "AssignmentSubmission", back_populates="assignment", cascade="all, delete-orphan"
    )


class AssignmentSubmission(BaseModel):
    """Student homework submission with evaluation state."""
    __tablename__ = "assignment_submissions"

    assignment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assignments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    submission_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attachment_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    submission_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(30), default="SUBMITTED", nullable=False)
    marks_awarded: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    teacher_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    assignment: Mapped["Assignment"] = relationship("Assignment", back_populates="submissions")
    student: Mapped["Student"] = relationship("Student")
    reviews: Mapped[List["SubmissionReview"]] = relationship(
        "SubmissionReview", back_populates="submission", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("assignment_id", "student_id", name="uq_assignment_student_submission"),
    )


class SubmissionReview(BaseModel):
    """Teacher review cycles and revision returns for student submissions."""
    __tablename__ = "submission_reviews"

    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assignment_submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reviewed_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    review_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(30), nullable=False)  # GRADED, RETURNED_FOR_REVISION
    feedback: Mapped[str] = mapped_column(Text, nullable=False)
    marks: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)

    submission: Mapped["AssignmentSubmission"] = relationship("AssignmentSubmission", back_populates="reviews")
    reviewer: Mapped["User"] = relationship("User")

