"""Health-check endpoint.

Reports application name/version and database connectivity. Used by
load balancers, monitoring, and the frontend readiness switch.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import __version__
from app.core.config import settings
from app.database import get_db

logger = logging.getLogger("pajes.health")
router = APIRouter(prefix="/health", tags=["health"])


@router.get("", summary="Liveness probe")
def liveness() -> dict[str, str]:
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": __version__,
        "env": settings.app_env,
    }


@router.get("/ready", summary="Readiness probe — includes DB check", response_model=None)
def readiness(db: Annotated[Session, Depends(get_db)]) -> dict[str, object] | JSONResponse:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.warning("Readiness database check failed (%s)", type(exc).__name__)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "degraded",
                "db": {"ok": False, "detail": "database unavailable"},
                "code": status.HTTP_503_SERVICE_UNAVAILABLE,
            },
        )

    return {
        "status": "ok",
        "db": {"ok": True, "detail": "connected"},
        "code": status.HTTP_200_OK,
    }
