"""Rate limiting middleware for login attempts.

Tracks login attempts per IP address in-memory. Prevents brute-force
attacks by limiting requests to login_rate_limit_per_minute per IP.
Uses a simple sliding window; for multi-process deployments a Redis
backend would be needed (documented as a future requirement).
"""

from __future__ import annotations

import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings


class LoginRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int | None = None, window_seconds: int | None = None):
        super().__init__(app)
        self._max = max_requests or settings.login_rate_limit_per_minute
        self._window = window_seconds or settings.login_rate_window_seconds
        self._attempts: dict[str, list[float]] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For", "")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _prune_old(self, ip: str, now: float) -> list[float]:
        cutoff = now - self._window
        self._attempts[ip] = [t for t in self._attempts[ip] if t > cutoff]
        return self._attempts[ip]

    async def dispatch(self, request: Request, call_next):
        if request.url.path != "/api/v1/auth/login" or request.method != "POST":
            return await call_next(request)

        ip = self._get_client_ip(request)
        now = time.monotonic()
        recent = self._prune_old(ip, now)

        if len(recent) >= self._max:
            return Response(
                content='{"detail":"Too many login attempts. Please try again later."}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": str(self._window)},
            )

        self._attempts[ip].append(now)
        return await call_next(request)
