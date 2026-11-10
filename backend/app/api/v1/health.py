"""Health-check endpoint.

Reports application name/version and database connectivity. Used by
load balancers, monitoring, and the frontend readiness switch.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import __version__
from app.core.config import settings
from app.database import get_db

router = APIRouter(prefix="/health", tags=["health"])


@router.get("", summary="Liveness probe")
def liveness() -> dict[str, str]:
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": __version__,
        "env": settings.app_env,
    }


@router.get("/ready", summary="Readiness probe — includes DB check")
def readiness(db: Session = Depends(get_db)) -> dict[str, object]:
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
        detail = "connected"
    except Exception as exc:  # noqa: BLE001 — any DB error = not ready
        db_ok = False
        detail = str(exc)

    return {
        "status": "ok" if db_ok else "degraded",
        "db": {"ok": db_ok, "detail": detail},
        "code": status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE,
    }
