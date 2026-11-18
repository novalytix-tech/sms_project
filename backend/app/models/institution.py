import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, Boolean, Integer, DateTime, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel, TenantModel


class Institution(BaseModel):
    """Educational institution / school campus master entity."""
    __tablename__ = "institutions"

    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    subdomain: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True, index=True)
    board_affiliation: Mapped[str] = mapped_column(String(50), default="CBSE", nullable=False)
    affiliation_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(100), default="India", nullable=False)
    postal_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)  # ACTIVE, SUSPENDED, TRIAL

    # Relationships
    service_entitlements: Mapped[List["ServiceEntitlement"]] = relationship(
        "ServiceEntitlement", back_populates="institution", cascade="all, delete-orphan"
    )
    settings: Mapped[List["InstitutionSetting"]] = relationship(
        "InstitutionSetting", back_populates="institution", cascade="all, delete-orphan"
    )


class ServiceEntitlement(TenantModel):
    """Feature flag and module entitlement per institution."""
    __tablename__ = "service_entitlements"

    service_key: Mapped[str] = mapped_column(String(50), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    max_quota: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    institution: Mapped["Institution"] = relationship("Institution", back_populates="service_entitlements")

    __table_args__ = (
        UniqueConstraint("institution_id", "service_key", name="uq_institution_service_key"),
        Index("idx_entitlement_lookup", "institution_id", "service_key"),
    )


class InstitutionSetting(TenantModel):
    """Key-value institution configuration and preferences."""
    __tablename__ = "institution_settings"

    category: Mapped[str] = mapped_column(String(50), default="GENERAL", nullable=False)
    setting_key: Mapped[str] = mapped_column(String(100), nullable=False)
    setting_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_type: Mapped[str] = mapped_column(String(20), default="STRING", nullable=False)

    institution: Mapped["Institution"] = relationship("Institution", back_populates="settings")

    __table_args__ = (
        UniqueConstraint("institution_id", "setting_key", name="uq_institution_setting_key"),
    )
