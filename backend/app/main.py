"""FastAPI application entrypoint.

Run locally with:
    uv run uvicorn app.main:app --reload --port 8000

The app is created via `create_app()` so tests can construct isolated
instances with overridden dependencies if needed.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI

from app.api.v1.health import router as health_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="PAJES accounting platform REST API.",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    # ── Middleware (order: outermost first) ────────────────────────────────
    from fastapi.middleware.cors import CORSMiddleware

    from app.middleware.csrf import CSRFMiddleware
    from app.middleware.rate_limit import LoginRateLimitMiddleware

    app.add_middleware(CSRFMiddleware)
    app.add_middleware(LoginRateLimitMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ────────────────────────────────────────────────────────────
    from app.api.v1 import router as v1_router

    app.include_router(health_router, prefix="/api/v1")
    app.include_router(v1_router, prefix="/api/v1")

    return app


app = create_app()
