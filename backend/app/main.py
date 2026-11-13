"""FastAPI application entrypoint.

Run locally with:
    uv run uvicorn app.main:app --reload --port 8001

The app is created via `create_app()` so tests can construct isolated
instances with overridden dependencies if needed.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.api.v1.health import router as health_router
from app.core.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    yield


class UnhandledErrorCorsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        try:
            return await call_next(request)
        except Exception as error:
            logger.error(
                "Unhandled API request error (%s)",
                type(error).__name__,
            )
            response = JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"},
            )
            origin = request.headers.get("Origin")
            if origin in settings.cors_origin_list:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Expose-Headers"] = (
                    settings.csrf_header_name
                )
                response.headers["Vary"] = "Origin"
            return response


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
    from app.middleware.csrf import CSRFMiddleware
    from app.middleware.rate_limit import LoginRateLimitMiddleware

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=[settings.csrf_header_name],
    )
    app.add_middleware(CSRFMiddleware)
    app.add_middleware(LoginRateLimitMiddleware)
    app.add_middleware(UnhandledErrorCorsMiddleware)

    # ── Routers ────────────────────────────────────────────────────────────
    from app.api.v1 import router as v1_router

    app.include_router(health_router, prefix="/api/v1")
    app.include_router(v1_router, prefix="/api/v1")

    return app


app = create_app()
api_app = app
