import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, Text, Boolean, DateTime, UniqueConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel, TenantModel


class Notification(TenantModel):
    """Broadcast and targeted push alerts."""
    __tablename__ = "notifications"

    sender_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[str] = mapped_column(String(50), default="ANNOUNCEMENT", nullable=False)
    target_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    sender: Mapped[Optional["User"]] = relationship("User")
    recipients: Mapped[List["NotificationRecipient"]] = relationship(
        "NotificationRecipient", back_populates="notification", cascade="all, delete-orphan"
    )


class NotificationRecipient(BaseModel):
    """User-specific delivery and read receipt status."""
    __tablename__ = "notification_recipients"

    notification_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("notifications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    notification: Mapped["Notification"] = relationship("Notification", back_populates="recipients")
    user: Mapped["User"] = relationship("User")

    __table_args__ = (
        UniqueConstraint("notification_id", "user_id", name="uq_notification_recipient"),
    )

