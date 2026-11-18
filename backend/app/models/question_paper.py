import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String, Text, Numeric, Integer, DateTime, UniqueConstraint, ForeignKey, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel, TenantModel


class QuestionPaper(TenantModel):
    """Confidential question paper master created by faculty."""
    __tablename__ = "question_papers"

    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    class_level_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("class_levels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    paper_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="DRAFT", nullable=False)
    total_marks: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("100.00"), nullable=False)
    time_allowed_minutes: Mapped[int] = mapped_column(Integer, default=180, nullable=False)

    subject: Mapped["Subject"] = relationship("Subject")
    class_level: Mapped["ClassLevel"] = relationship("ClassLevel")
    author: Mapped["User"] = relationship("User")
    versions: Mapped[List["QuestionPaperVersion"]] = relationship(
        "QuestionPaperVersion", back_populates="paper", cascade="all, delete-orphan"
    )
    reviews: Mapped[List["QuestionPaperReview"]] = relationship(
        "QuestionPaperReview", back_populates="paper", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("institution_id", "paper_code", name="uq_institution_paper_code"),
    )


class QuestionPaperVersion(BaseModel):
    """Immutable version snapshot for audit integrity (never overwritten)."""
    __tablename__ = "question_paper_versions"

    paper_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("question_papers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    content_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attachment_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    change_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    paper: Mapped["QuestionPaper"] = relationship("QuestionPaper", back_populates="versions")
    creator: Mapped["User"] = relationship("User")

    __table_args__ = (
        UniqueConstraint("paper_id", "version_number", name="uq_paper_version_number"),
    )


class QuestionPaperReview(BaseModel):
    """Confidential Principal moderation review queue entry."""
    __tablename__ = "question_paper_reviews"

    paper_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("question_papers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("question_paper_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reviewer_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    review_decision: Mapped[str] = mapped_column(String(30), nullable=False)  # APPROVED, CHANGES_REQUESTED, REJECTED
    comments: Mapped[str] = mapped_column(Text, nullable=False)
    review_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    paper: Mapped["QuestionPaper"] = relationship("QuestionPaper", back_populates="reviews")
    version: Mapped["QuestionPaperVersion"] = relationship("QuestionPaperVersion")
    reviewer: Mapped["User"] = relationship("User")


class QuestionPaperAmendment(BaseModel):
    """Post-finalization emergency corrections log."""
    __tablename__ = "question_paper_amendments"

    paper_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("question_papers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amended_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    amendment_reason: Mapped[str] = mapped_column(Text, nullable=False)
    amended_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    paper: Mapped["QuestionPaper"] = relationship("QuestionPaper")
    moderator: Mapped["User"] = relationship("User")

