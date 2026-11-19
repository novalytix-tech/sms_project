import uuid
from datetime import date, time
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    Boolean, String, Text, Numeric, Date, Time, UniqueConstraint, CheckConstraint, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel, TenantModel


class GradingScale(TenantModel):
    """Institutional grading scale (e.g. CBSE 9-point scale or percentage brackets)."""
    __tablename__ = "grading_scales"

    name: Mapped[str] = mapped_column(String(50), nullable=False)
    min_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    max_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    grade: Mapped[str] = mapped_column(String(10), nullable=False)
    grade_point: Mapped[Decimal] = mapped_column(Numeric(3, 1), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    __table_args__ = (
        CheckConstraint("min_percentage <= max_percentage", name="chk_grading_percentage_range"),
    )


class Exam(TenantModel):
    """Examination cycle / term test master."""
    __tablename__ = "exams"

    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academic_years.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    term_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("terms.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Class-section this exam is held for (one exam per section, as the school manages them).
    section_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sections.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    exam_type: Mapped[str] = mapped_column(String(50), default="SUMMATIVE", nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="SCHEDULED", nullable=False)

    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")
    term: Mapped[Optional["Term"]] = relationship("Term")
    section: Mapped[Optional["Section"]] = relationship("Section")
    schedules: Mapped[List["ExamSchedule"]] = relationship("ExamSchedule", back_populates="exam", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("institution_id", "academic_year_id", "section_id", "name", name="uq_institution_exam_section_name"),
        CheckConstraint("start_date <= end_date", name="chk_exam_dates"),
    )


class ExamSchedule(BaseModel):
    """Timetable slot for an exam paper."""
    __tablename__ = "exam_schedules"

    exam_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    class_level_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("class_levels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    room_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rooms.id", ondelete="SET NULL"),
        nullable=True,
    )
    room_label: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    exam_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    max_marks: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("100.00"), nullable=False)
    passing_marks: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("33.00"), nullable=False)

    exam: Mapped["Exam"] = relationship("Exam", back_populates="schedules")
    class_level: Mapped["ClassLevel"] = relationship("ClassLevel")
    subject: Mapped["Subject"] = relationship("Subject")
    room: Mapped[Optional["Room"]] = relationship("Room")
    results: Mapped[List["ExamResult"]] = relationship("ExamResult", back_populates="exam_schedule", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("exam_id", "class_level_id", "subject_id", name="uq_exam_class_subject"),
        CheckConstraint("start_time < end_time", name="chk_exam_time_range"),
        CheckConstraint("passing_marks <= max_marks", name="chk_exam_passing_marks"),
    )


class ExamResult(BaseModel):
    """Student marks scored in an examination schedule."""
    __tablename__ = "exam_results"

    exam_schedule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exam_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    enrollment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("student_enrollments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    marks_obtained: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    is_absent: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    grade: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evaluated_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    exam_schedule: Mapped["ExamSchedule"] = relationship("ExamSchedule", back_populates="results")
    enrollment: Mapped["StudentEnrollment"] = relationship("StudentEnrollment")
    evaluator: Mapped[Optional["User"]] = relationship("User")

    __table_args__ = (
        UniqueConstraint("exam_schedule_id", "enrollment_id", name="uq_exam_schedule_enrollment"),
        CheckConstraint("marks_obtained >= 0", name="chk_exam_marks_positive"),
    )

