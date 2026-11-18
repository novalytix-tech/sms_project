import uuid
from datetime import date
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import String, Text, Numeric, Date, UniqueConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel, TenantModel


class AdmissionInquiry(TenantModel):
    """Initial prospective student inquiry."""
    __tablename__ = "admission_inquiries"

    parent_name: Mapped[str] = mapped_column(String(100), nullable=False)
    applicant_name: Mapped[str] = mapped_column(String(100), nullable=False)
    target_class_level_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("class_levels.id", ondelete="CASCADE"),
        nullable=False,
    )
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    inquiry_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    source: Mapped[str] = mapped_column(String(50), default="WEBSITE", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="NEW", nullable=False)  # NEW, CONTACTED, APPLIED
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Extra applicant details captured from the public enquiry form
    applicant_dob: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    previous_school: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    previous_class: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    previous_board: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    interested_class_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    alternate_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    relationship_to_applicant: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    target_class: Mapped["ClassLevel"] = relationship("ClassLevel")


class AdmissionApplication(TenantModel):
    """Full admission application submitted for review and entrance assessment."""
    __tablename__ = "admission_applications"

    inquiry_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("admission_inquiries.id", ondelete="SET NULL"),
        nullable=True,
    )
    application_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    applicant_first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    applicant_last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    target_class_level_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("class_levels.id", ondelete="CASCADE"),
        nullable=False,
    )
    target_academic_year_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academic_years.id", ondelete="CASCADE"),
        nullable=False,
    )
    submission_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    assessment_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="SUBMITTED", nullable=False)  # SUBMITTED, OFFERED, ENROLLED

    target_class: Mapped["ClassLevel"] = relationship("ClassLevel")
    target_year: Mapped["AcademicYear"] = relationship("AcademicYear")
    documents: Mapped[List["ApplicationDocument"]] = relationship(
        "ApplicationDocument", back_populates="application", cascade="all, delete-orphan"
    )
    evaluations: Mapped[List["ApplicationEvaluation"]] = relationship(
        "ApplicationEvaluation", back_populates="application", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("institution_id", "application_number", name="uq_institution_application_number"),
    )


class ApplicationDocument(BaseModel):
    """Verification documents uploaded with admission application."""
    __tablename__ = "application_documents"

    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("admission_applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    document_name: Mapped[str] = mapped_column(String(100), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    verification_status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)

    application: Mapped["AdmissionApplication"] = relationship("AdmissionApplication", back_populates="documents")


class ApplicationEvaluation(BaseModel):
    """Assessment score and entrance test evaluation."""
    __tablename__ = "application_evaluations"

    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("admission_applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evaluator_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    assessment_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    marks_obtained: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    max_marks: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    recommendation: Mapped[str] = mapped_column(String(30), default="RECOMMENDED", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    application: Mapped["AdmissionApplication"] = relationship("AdmissionApplication", back_populates="evaluations")
    evaluator: Mapped["User"] = relationship("User")

