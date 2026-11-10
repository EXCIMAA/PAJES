"""Generic migration: initial schema placeholder.

Revision ID: 0001_initial
Revises:
Create Date: 2026-11-04

No tables are created in this revision. It establishes the migration
baseline. Concrete tables arrive in per-module revisions as the
authentication, users, and business modules are implemented in later
phases.
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
