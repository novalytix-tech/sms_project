import uuid
from datetime import date
from typing import Optional, List
from sqlalchemy import String, Text, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel, TenantModel


class AcademicAward(TenantModel):
    """Institutional honour, scholarship, or competition distinction."""
    __tablename__ = "academic_awards"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="ACADEMIC", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    criteria: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    recipients: Mapped[List["StudentAward"]] = relationship(
        "StudentAward", back_populates="award", cascade="all, delete-orphan"
    )


class StudentAward(BaseModel):
    """Award conferral to a student for an academic session."""
    __tablename__ = "student_awards"

    award_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academic_awards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academic_years.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    awarded_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    certificate_number: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    award: Mapped["AcademicAward"] = relationship("AcademicAward", back_populates="recipients")
    student: Mapped["Student"] = relationship("Student")
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")

