import uuid
from datetime import date
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String, Boolean, Integer, Numeric, Date, UniqueConstraint, CheckConstraint, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel, TenantModel


class AcademicYear(TenantModel):
    """Academic session/calendar year for an institution."""
    __tablename__ = "academic_years"

    name: Mapped[str] = mapped_column(String(50), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    terms: Mapped[List["Term"]] = relationship("Term", back_populates="academic_year", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("institution_id", "name", name="uq_institution_academic_year"),
        CheckConstraint("start_date < end_date", name="chk_academic_year_dates"),
    )


class Term(BaseModel):
    """Academic term / semester within an academic year."""
    __tablename__ = "terms"

    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academic_years.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear", back_populates="terms")

    __table_args__ = (
        UniqueConstraint("academic_year_id", "name", name="uq_term_academic_year"),
        CheckConstraint("start_date < end_date", name="chk_term_dates"),
    )


class Room(TenantModel):
    """Classroom or laboratory facility."""
    __tablename__ = "rooms"

    room_number: Mapped[str] = mapped_column(String(50), nullable=False)
    building: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    floor: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    capacity: Mapped[int] = mapped_column(Integer, default=40, nullable=False)
    room_type: Mapped[str] = mapped_column(String(50), default="CLASSROOM", nullable=False)

    __table_args__ = (
        UniqueConstraint("institution_id", "room_number", name="uq_institution_room_number"),
        CheckConstraint("capacity > 0", name="chk_room_capacity_positive"),
    )


class ClassLevel(TenantModel):
    """Standard / grade level (e.g. Grade 10, Class 1)."""
    __tablename__ = "class_levels"

    name: Mapped[str] = mapped_column(String(50), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    sequence_order: Mapped[int] = mapped_column(Integer, nullable=False)

    sections: Mapped[List["Section"]] = relationship("Section", back_populates="class_level", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("institution_id", "name", name="uq_institution_class_name"),
        UniqueConstraint("institution_id", "code", name="uq_institution_class_code"),
    )


class Section(BaseModel):
    """Class division/section (e.g. 10-A, 10-B)."""
    __tablename__ = "sections"

    class_level_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("class_levels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(10), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=40, nullable=False)
    room_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rooms.id", ondelete="SET NULL"),
        nullable=True,
    )
    class_teacher_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    class_level: Mapped["ClassLevel"] = relationship("ClassLevel", back_populates="sections")
    room: Mapped[Optional["Room"]] = relationship("Room")
    class_teacher: Mapped[Optional["User"]] = relationship("User")
    class_subjects: Mapped[List["ClassSubject"]] = relationship("ClassSubject", back_populates="section", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("class_level_id", "name", name="uq_class_level_section"),
        CheckConstraint("capacity > 0", name="chk_section_capacity_positive"),
    )


class Subject(TenantModel):
    """Academic subject curriculum definition."""
    __tablename__ = "subjects"

    code: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    subject_type: Mapped[str] = mapped_column(String(30), default="THEORY", nullable=False)  # THEORY, PRACTICAL
    credit_hours: Mapped[Decimal] = mapped_column(Numeric(4, 1), default=Decimal("1.0"), nullable=False)

    __table_args__ = (
        UniqueConstraint("institution_id", "code", name="uq_institution_subject_code"),
    )


class ClassSubject(BaseModel):
    """Association of subject taught in a section."""
    __tablename__ = "class_subjects"

    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_elective: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    section: Mapped["Section"] = relationship("Section", back_populates="class_subjects")
    subject: Mapped["Subject"] = relationship("Subject")
    teacher_assignments: Mapped[List["TeacherAssignment"]] = relationship(
        "TeacherAssignment", back_populates="class_subject", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("section_id", "subject_id", name="uq_section_subject"),
    )


class TeacherAssignment(BaseModel):
    """Faculty allocation to teach subject in section for an academic year."""
    __tablename__ = "teacher_assignments"

    class_subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("class_subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academic_years.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    class_subject: Mapped["ClassSubject"] = relationship("ClassSubject", back_populates="teacher_assignments")
    teacher: Mapped["User"] = relationship("User")
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")

    __table_args__ = (
        UniqueConstraint("class_subject_id", "teacher_id", "academic_year_id", name="uq_teacher_class_subject_year"),
    )

