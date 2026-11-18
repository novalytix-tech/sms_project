import uuid
from datetime import date, datetime, timezone
from typing import Optional, List
from sqlalchemy import (
    String, Text, Boolean, Date, DateTime, UniqueConstraint, ForeignKey, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel, TenantModel


class Notice(TenantModel):
    """Institutional circulars and notice board bulletins."""
    __tablename__ = "notices"

    author_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)
    target_audience: Mapped[str] = mapped_column(String(50), default="ALL", nullable=False)
    publish_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    attachment_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    author: Mapped["User"] = relationship("User")


class Message(TenantModel):
    """1-to-1 threaded messaging between campus stakeholders."""
    __tablename__ = "messages"

    sender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recipient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])
    recipient: Mapped["User"] = relationship("User", foreign_keys=[recipient_id])


class CommunicationGroup(TenantModel):
    """Collaboration channels for staff and class groups."""
    __tablename__ = "communication_groups"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    group_type: Mapped[str] = mapped_column(String(50), default="CUSTOM", nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    creator: Mapped["User"] = relationship("User")
    members: Mapped[List["GroupMember"]] = relationship(
        "GroupMember", back_populates="group", cascade="all, delete-orphan"
    )
    messages: Mapped[List["GroupMessage"]] = relationship(
        "GroupMessage", back_populates="group", cascade="all, delete-orphan"
    )


class GroupMember(BaseModel):
    """Membership roster for communication groups."""
    __tablename__ = "group_members"

    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communication_groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(20), default="MEMBER", nullable=False)

    group: Mapped["CommunicationGroup"] = relationship("CommunicationGroup", back_populates="members")
    user: Mapped["User"] = relationship("User")

    __table_args__ = (
        UniqueConstraint("group_id", "user_id", name="uq_group_member"),
    )


class GroupMessage(BaseModel):
    """Message post in a communication channel."""
    __tablename__ = "group_messages"

    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communication_groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    group: Mapped["CommunicationGroup"] = relationship("CommunicationGroup", back_populates="messages")
    sender: Mapped["User"] = relationship("User")

