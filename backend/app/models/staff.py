import uuid
from datetime import date
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import String, Integer, Numeric, Date, Boolean, UniqueConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel, TenantModel


class Department(TenantModel):
    """Institutional staff department (e.g. Science, Mathematics, Humanities)."""
    __tablename__ = "departments"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    head_of_department_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    __table_args__ = (
        UniqueConstraint("institution_id", "name", name="uq_institution_department_name"),
    )


class StaffProfile(TenantModel):
    """Faculty and administrative employee master profile."""
    __tablename__ = "staff_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    employee_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
    )
    designation: Mapped[str] = mapped_column(String(100), nullable=False)
    employment_type: Mapped[str] = mapped_column(String(50), default="PERMANENT", nullable=False)
    joining_date: Mapped[date] = mapped_column(Date, nullable=False)
    basic_salary: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)

    user: Mapped["User"] = relationship("User")
    department: Mapped[Optional["Department"]] = relationship("Department")
    qualifications: Mapped[List["Qualification"]] = relationship(
        "Qualification", back_populates="staff_profile", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("institution_id", "employee_id", name="uq_institution_employee_id"),
    )


class TeacherProfile(BaseModel):
    """Pedagogical profile for academic teaching staff."""
    __tablename__ = "teacher_profiles"

    staff_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("staff_profiles.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    specialization: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    teaching_experience_years: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_class_teacher: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    staff_profile: Mapped["StaffProfile"] = relationship("StaffProfile")


class Qualification(BaseModel):
    """Educational qualifications attained by staff."""
    __tablename__ = "qualifications"

    staff_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("staff_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    degree_title: Mapped[str] = mapped_column(String(100), nullable=False)
    institution_name: Mapped[str] = mapped_column(String(255), nullable=False)
    year_of_passing: Mapped[int] = mapped_column(Integer, nullable=False)
    grade_or_percentage: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    staff_profile: Mapped["StaffProfile"] = relationship("StaffProfile", back_populates="qualifications")


class LibraryStaffAssignment(BaseModel):
    """Dual-role appointment enabling teachers to manage the library circulation desk."""
    __tablename__ = "library_staff_assignments"

    staff_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("staff_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role_title: Mapped[str] = mapped_column(String(100), default="Librarian In-Charge", nullable=False)
    assigned_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)

    staff_profile: Mapped["StaffProfile"] = relationship("StaffProfile")

    __table_args__ = (
        UniqueConstraint("staff_profile_id", "status", name="uq_staff_active_library_role"),
    )

