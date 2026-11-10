"""Alembic migrations environment.

Reads the database URL from PAJES settings (not from alembic.ini) so the
same .env drives both the application and migrations. Uses SQLAlchemy 2.x
style with the shared declarative MetaData.
"""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.database import Base

# Import all model modules here so Base.metadata is fully populated before
# autogenerate runs. As modules are added in later phases, append imports:
#   from app.models import auth, users, clients, ...  # noqa: F401

config = context.config

# Inject the runtime database URL, overriding the placeholder in alembic.ini.
config.set_main_option("sqlalchemy.url", settings.effective_database_url())

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
