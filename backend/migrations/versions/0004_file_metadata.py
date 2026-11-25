"""Add file_metadata table for local/S3 file storage migration.

Revision ID: 0004_file_metadata
Revises: 0003_default_user_role
Create Date: 2026-11-24
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_file_metadata"
down_revision: str | None = "0003_default_user_role"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "file_metadata",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("original_name", sa.Text(), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("bucket", sa.String(length=100), nullable=False, server_default="documents"),
        sa.Column("mime_type", sa.String(length=255), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column(
            "uploaded_by",
            sa.Uuid(),
            sa.ForeignKey("public.profiles.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=True,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id", name="pk_file_metadata"),
        schema="public",
    )
    op.create_index(
        "ix_file_metadata_bucket",
        "file_metadata",
        ["bucket"],
        schema="public",
    )
    op.create_index(
        "ix_file_metadata_uploaded_by",
        "file_metadata",
        ["uploaded_by"],
        schema="public",
    )


def downgrade() -> None:
    op.drop_index("ix_file_metadata_uploaded_by", table_name="file_metadata", schema="public")
    op.drop_index("ix_file_metadata_bucket", table_name="file_metadata", schema="public")
    op.drop_table("file_metadata", schema="public")
