import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel, TenantModel


class ReportTemplate(BaseModel):
    """Reusable analytics report template definition."""
    __tablename__ = "report_templates"

    institution_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    module: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    query_definition_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_system_template: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class SavedReport(TenantModel):
    """Generated snapshot report with download artifact URL."""
    __tablename__ = "saved_reports"

    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("report_templates.id", ondelete="SET NULL"),
        nullable=True,
    )
    generated_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    parameters_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    template: Mapped[Optional["ReportTemplate"]] = relationship("ReportTemplate")
    generator: Mapped["User"] = relationship("User")

