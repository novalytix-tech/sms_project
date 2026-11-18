"""Switch authentication to Clerk: add users.clerk_user_id, drop password/JWT tables.

Revision ID: a1c9e0f2b7d4
Revises: 341123d7b3c5
"""
from alembic import op
import sqlalchemy as sa

revision = "a1c9e0f2b7d4"
down_revision = "341123d7b3c5"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("clerk_user_id", sa.String(length=64), nullable=True))
    op.create_index("ix_users_clerk_user_id", "users", ["clerk_user_id"], unique=True)
    op.drop_column("users", "password_hash")
    op.drop_column("users", "must_change_password")
    op.drop_table("token_blocklist")
    op.drop_table("password_resets")


def downgrade():
    # Passwords are not recoverable; downgrade only restores the schema shape.
    op.create_table(
        "password_resets",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_used", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("used_at", sa.DateTime(timezone=True)),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "token_blocklist",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("jti", sa.String(36), nullable=False, unique=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_type", sa.String(10), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.add_column("users", sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("users", sa.Column("password_hash", sa.String(255), nullable=False, server_default=""))
    op.drop_index("ix_users_clerk_user_id", table_name="users")
    op.drop_column("users", "clerk_user_id")
