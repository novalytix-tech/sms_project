import uuid
from datetime import date, time, datetime, timezone
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String, Boolean, Integer, Numeric, Date, Time, DateTime, UniqueConstraint, CheckConstraint, ForeignKey, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel, TenantModel


class TransportRoute(TenantModel):
    """Institutional bus transit route."""
    __tablename__ = "transport_routes"

    route_name: Mapped[str] = mapped_column(String(100), nullable=False)
    route_code: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    start_point: Mapped[str] = mapped_column(String(255), nullable=False)
    end_point: Mapped[str] = mapped_column(String(255), nullable=False)
    fare_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)

    stops: Mapped[List["TransportStop"]] = relationship(
        "TransportStop", back_populates="route", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("institution_id", "route_code", name="uq_institution_route_code"),
    )


class TransportStop(BaseModel):
    """Designated passenger stop along a transport route."""
    __tablename__ = "transport_stops"

    route_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transport_routes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    stop_name: Mapped[str] = mapped_column(String(100), nullable=False)
    sequence_order: Mapped[int] = mapped_column(Integer, nullable=False)
    pickup_time: Mapped[time] = mapped_column(Time, nullable=False)
    drop_time: Mapped[time] = mapped_column(Time, nullable=False)
    latitude: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)

    route: Mapped["TransportRoute"] = relationship("TransportRoute", back_populates="stops")

    __table_args__ = (
        UniqueConstraint("route_id", "sequence_order", name="uq_route_stop_sequence"),
    )


class TransportVehicle(TenantModel):
    """Fleet vehicle (bus, van) with driver and telemetry metadata."""
    __tablename__ = "transport_vehicles"

    vehicle_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    capacity: Mapped[int] = mapped_column(Integer, default=32, nullable=False)
    insurance_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    fitness_valid_until: Mapped[date] = mapped_column(Date, nullable=False)
    driver_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    gps_device_imei: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True)
    current_lat: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    current_lng: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    last_telemetry_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)

    driver: Mapped[Optional["User"]] = relationship("User")

    __table_args__ = (
        UniqueConstraint("institution_id", "vehicle_number", name="uq_institution_vehicle_number"),
        CheckConstraint("capacity > 0", name="chk_vehicle_capacity_positive"),
    )


class TransportAllocation(BaseModel):
    """Student subscription to bus route and boarding stop."""
    __tablename__ = "transport_allocations"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    route_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transport_routes.id", ondelete="RESTRICT"),
        nullable=False,
    )
    stop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transport_stops.id", ondelete="RESTRICT"),
        nullable=False,
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transport_vehicles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academic_years.id", ondelete="CASCADE"),
        nullable=False,
    )
    start_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)

    student: Mapped["Student"] = relationship("Student")
    route: Mapped["TransportRoute"] = relationship("TransportRoute")
    stop: Mapped["TransportStop"] = relationship("TransportStop")
    vehicle: Mapped["TransportVehicle"] = relationship("TransportVehicle")
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")

    __table_args__ = (
        UniqueConstraint("student_id", "academic_year_id", name="uq_student_transport_year"),
    )


class TransportTrip(BaseModel):
    """Daily operational trip manifest."""
    __tablename__ = "transport_trips"

    route_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transport_routes.id", ondelete="CASCADE"),
        nullable=False,
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transport_vehicles.id", ondelete="CASCADE"),
        nullable=False,
    )
    driver_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    trip_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    trip_type: Mapped[str] = mapped_column(String(20), default="MORNING_PICKUP", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="SCHEDULED", nullable=False)
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    route: Mapped["TransportRoute"] = relationship("TransportRoute")
    vehicle: Mapped["TransportVehicle"] = relationship("TransportVehicle")
    driver: Mapped["User"] = relationship("User")


class TransportTelemetryLog(BaseModel):
    """Raw GPS telemetry separating simulated frontend animations from actual AIS-140 device feeds."""
    __tablename__ = "transport_telemetry_logs"

    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transport_vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    latitude: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    speed_kmh: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    heading_degrees: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    vehicle: Mapped["TransportVehicle"] = relationship("TransportVehicle")

