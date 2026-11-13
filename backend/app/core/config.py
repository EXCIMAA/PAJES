"""Centralized configuration via Pydantic Settings.

All settings are read from environment variables (or a local .env file).
No credentials are hardcoded. See backend/.env.example for every option.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field, field_validator, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────────────────────
    app_name: str = "PAJES API"
    app_env: Literal["development", "staging", "production"] = "development"
    app_debug: bool = False
    cors_origins: str = (
        "http://localhost:5173,http://localhost:5174,"
        "http://127.0.0.1:5173,http://127.0.0.1:5174"
    )
    secure_cookies: bool = False

    # ── PostgreSQL ─────────────────────────────────────────────────────────
    database_url: str | None = None
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "pajes_admin"
    db_password: str = "change_me"
    db_name: str = "pajes_dev"

    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_recycle: int = 3600
    db_pool_pre_ping: bool = True

    # ── Auth / sessions ────────────────────────────────────────────────────
    auth_secret_key: str = "change_this_to_a_long_random_secret"
    auth_cookie_name: str = "pajes_session"
    auth_session_ttl_minutes: int = 480
    activation_token_ttl_hours: int = 24
    password_reset_token_ttl_minutes: int = 30
    argon2_time_cost: int = 3
    argon2_memory_cost: int = 65536
    argon2_parallelism: int = 2

    # ── Rate limiting ──────────────────────────────────────────────────────
    login_rate_limit_per_minute: int = 10
    login_rate_window_seconds: int = 60
    signup_rate_limit_per_minute: int = 5
    activation_rate_limit_per_minute: int = 10
    password_reset_rate_limit_per_minute: int = 5

    # ── CSRF ───────────────────────────────────────────────────────────────
    csrf_enabled: bool = True
    csrf_cookie_name: str = "pajes_csrf"
    csrf_header_name: str = "X-CSRF-Token"

    # ── Email (transactional provider, configurable) ──────────────────────
    email_provider: Literal["smtp", "sendgrid", "postmark", "none"] = "none"
    email_from_address: str = "noreply@excimaa.com"
    email_from_name: str = "PAJES"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    sendgrid_api_key: str | None = None
    postmark_api_key: str | None = None
    frontend_url: str = "http://127.0.0.1:5174"

    # ── File storage ───────────────────────────────────────────────────────
    storage_backend: Literal["local", "s3"] = "local"
    storage_local_dir: str = "./storage"
    s3_endpoint_url: str | None = None
    s3_region: str | None = None
    s3_bucket_name: str | None = None
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    storage_max_upload_bytes: int = 20 * 1024 * 1024

    # ── Power BI Embedded ──────────────────────────────────────────────────
    powerbi_tenant_id: str | None = None
    powerbi_client_id: str | None = None
    powerbi_client_secret: str | None = None
    powerbi_workspace_id: str | None = None
    powerbi_default_report_id: str | None = None
    powerbi_report_ids: str = ""
    powerbi_dataset_id: str | None = None
    powerbi_rls_role: str | None = None

    # ── Computed helpers ───────────────────────────────────────────────────
    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def secure_auth_cookies(self) -> bool:
        return self.secure_cookies or self.is_production

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        aliases: list[str] = []
        for origin in origins:
            for scheme in ("http://", "https://"):
                if origin.startswith(f"{scheme}localhost:"):
                    aliases.append(origin.replace("localhost:", "127.0.0.1:", 1))
                elif origin.startswith(f"{scheme}127.0.0.1:"):
                    aliases.append(origin.replace("127.0.0.1:", "localhost:", 1))
        return list(dict.fromkeys([*origins, *aliases]))

    def effective_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+psycopg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def powerbi_configured(self) -> bool:
        return all([
            self.powerbi_tenant_id,
            self.powerbi_client_id,
            self.powerbi_client_secret,
            self.powerbi_workspace_id,
        ]) and bool(self.powerbi_report_id_list)

    @property
    def powerbi_report_id_list(self) -> list[str]:
        configured = [value.strip() for value in self.powerbi_report_ids.split(",") if value.strip()]
        if self.powerbi_default_report_id and self.powerbi_default_report_id not in configured:
            configured.append(self.powerbi_default_report_id)
        return list(dict.fromkeys(configured))

    @field_validator("auth_secret_key")
    @classmethod
    def _non_default_secret(cls, v: str) -> str:
        if v == "change_this_to_a_long_random_secret":
            import warnings

            warnings.warn(
                "AUTH_SECRET_KEY is still the default placeholder. "
                "Set a strong random value before running in production.",
                stacklevel=2,
            )
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
