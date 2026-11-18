import uuid
from datetime import date, time
from typing import Optional
from sqlalchemy import (
    String, Text, Boolean, Integer, Date, Time, UniqueConstraint, CheckConstraint, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel, TenantModel


class TimetablePeriod(TenantModel):
    """Bell schedule defining standard daily instructional periods."""
    __tablename__ = "timetable_periods"

    name: Mapped[str] = mapped_column(String(50), nullable=False)
    period_number: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    is_break: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint("institution_id", "period_number", name="uq_institution_period_number"),
        CheckConstraint("start_time < end_time", name="chk_period_time_range"),
    )


class TimetableSlot(BaseModel):
    """Individual class timetable slot with anti-conflict collision constraints."""
    __tablename__ = "timetable_slots"

    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academic_years.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
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
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    period_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("timetable_periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 1=Mon, 2=Tue, ..., 7=Sun

    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")
    section: Mapped["Section"] = relationship("Section")
    subject: Mapped["Subject"] = relationship("Subject")
    teacher: Mapped["User"] = relationship("User")
    room: Mapped["Room"] = relationship("Room")
    period: Mapped["TimetablePeriod"] = relationship("TimetablePeriod")

    __table_args__ = (
        # Mandatory constraint 1: Teacher cannot be assigned to conflicting periods
        UniqueConstraint("teacher_id", "period_id", "day_of_week", "academic_year_id", name="uq_teacher_timetable_slot"),
        # Mandatory constraint 2: Room cannot be double-booked
        UniqueConstraint("room_id", "period_id", "day_of_week", "academic_year_id", name="uq_room_timetable_slot"),
        # Mandatory constraint 3: Section cannot be in two places at once
        UniqueConstraint("section_id", "period_id", "day_of_week", "academic_year_id", name="uq_section_timetable_slot"),
        CheckConstraint("day_of_week >= 1 AND day_of_week <= 7", name="chk_day_of_week_valid"),
    )


class CalendarEvent(TenantModel):
    """Institutional calendar events, holidays, examinations, and meetings."""
    __tablename__ = "calendar_events"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    event_type: Mapped[str] = mapped_column(String(50), default="EVENT", nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    target_audience: Mapped[str] = mapped_column(String(50), default="ALL", nullable=False)

    __table_args__ = (
        CheckConstraint("start_date <= end_date", name="chk_calendar_event_dates"),
    )

