import uuid
from datetime import date
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String, Text, Boolean, Numeric, Date, CheckConstraint, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel, TenantModel


class MarketingCampaign(TenantModel):
    """Institutional admissions digital marketing and outreach campaign."""
    __tablename__ = "marketing_campaigns"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    platform: Mapped[str] = mapped_column(String(50), default="META", nullable=False)
    allocated_budget: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    spent_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_approved_by_principal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PLANNED", nullable=False)

    leads: Mapped[List["MarketingLead"]] = relationship(
        "MarketingLead", back_populates="campaign", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint("start_date <= end_date", name="chk_campaign_dates"),
        CheckConstraint("allocated_budget >= 0", name="chk_campaign_budget_positive"),
    )


class MarketingLead(TenantModel):
    """Prospective parent/student enrollment lead CRM record."""
    __tablename__ = "marketing_leads"

    campaign_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("marketing_campaigns.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    lead_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    target_class: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    stage: Mapped[str] = mapped_column(String(30), default="PROSPECT", nullable=False)  # PROSPECT, CONTACTED, APPLIED
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    campaign: Mapped[Optional["MarketingCampaign"]] = relationship("MarketingCampaign", back_populates="leads")


class MarketingActivity(BaseModel):
    """Content calendar post or promotional sprint schedule."""
    __tablename__ = "marketing_activities"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("marketing_campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    activity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False)
    content_copy: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="SCHEDULED", nullable=False)

    campaign: Mapped["MarketingCampaign"] = relationship("MarketingCampaign")

