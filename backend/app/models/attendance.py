import uuid
from datetime import date, time
from typing import Optional
from sqlalchemy import String, Text, Date, Time, UniqueConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel, TenantModel


class StudentAttendance(BaseModel):
    """Daily attendance record per enrolled student."""
    __tablename__ = "student_attendance"

    enrollment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("student_enrollments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attendance_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="PRESENT", nullable=False)  # PRESENT, ABSENT, LATE, EXCUSED
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recorded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    enrollment: Mapped["StudentEnrollment"] = relationship("StudentEnrollment")
    recorder: Mapped["User"] = relationship("User")

    __table_args__ = (
        # Mandatory constraint: One attendance record per student per school day
        UniqueConstraint("enrollment_id", "attendance_date", name="uq_student_attendance_date"),
    )


class StaffAttendance(TenantModel):
    """Daily attendance and biometric check-in/out for faculty and staff."""
    __tablename__ = "staff_attendance"

    staff_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attendance_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    check_in_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    check_out_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="PRESENT", nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recorded_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    staff_user: Mapped["User"] = relationship("User", foreign_keys=[staff_user_id])

    __table_args__ = (
        UniqueConstraint("staff_user_id", "attendance_date", name="uq_staff_attendance_date"),
    )


class AttendanceAuditCorrection(BaseModel):
    """Immutable audit trail for manual corrections to historical attendance."""
    __tablename__ = "attendance_audit_corrections"

    attendance_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    attendance_type: Mapped[str] = mapped_column(String(20), nullable=False)  # 'STUDENT' or 'STAFF'
    previous_status: Mapped[str] = mapped_column(String(20), nullable=False)
    corrected_status: Mapped[str] = mapped_column(String(20), nullable=False)
    correction_reason: Mapped[str] = mapped_column(Text, nullable=False)
    corrected_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    corrector: Mapped["User"] = relationship("User")

