import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.extensions import db


class BaseModel(db.Model):
    """Abstract base model with standard UUID primary key, timestamps and soft deletion."""
    __abstract__ = True

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        sort_order=-10,
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        server_default="false",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def soft_delete(self):
        """Mark record as soft deleted."""
        self.is_deleted = True
        self.updated_at = datetime.now(timezone.utc)


class TenantModel(BaseModel):
    """Abstract model for all multi-tenant entities scoped to an institution."""
    __abstract__ = True

    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        db.ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        sort_order=-5,
    )

