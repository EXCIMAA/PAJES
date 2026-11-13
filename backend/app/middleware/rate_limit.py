"""Per-process sliding-window limits for authentication endpoints.

The application must use a shared rate-limit store before deploying multiple
workers or instances; this middleware intentionally does not trust forwarded IP
headers unless a trusted-proxy policy is configured.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings


class LoginRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        max_requests: int | None = None,
        window_seconds: int | None = None,
    ):
        super().__init__(app)
        default_window = settings.login_rate_window_seconds
        self._window = window_seconds or default_window
        shared_limit = max_requests
        self._limits = {
            "/api/v1/auth/login": shared_limit or settings.login_rate_limit_per_minute,
            "/api/v1/auth/signup": shared_limit or settings.signup_rate_limit_per_minute,
            "/api/v1/auth/activate": (
                shared_limit or settings.activation_rate_limit_per_minute
            ),
            "/api/v1/auth/reset-password": (
                shared_limit or settings.password_reset_rate_limit_per_minute
            ),
            "/api/v1/auth/reset-password/confirm": (
                shared_limit or settings.password_reset_rate_limit_per_minute
            ),
        }
        self._attempts: dict[tuple[str, str], deque[float]] = defaultdict(deque)

    def _client_ip(self, request: Request) -> str:
        return request.client.host if request.client else "unknown"

    async def dispatch(self, request: Request, call_next):
        path = request.url.path.rstrip("/")
        limit = self._limits.get(path)
        if request.method != "POST" or limit is None:
            return await call_next(request)

        key = (self._client_ip(request), path)
        now = time.monotonic()
        attempts = self._attempts[key]
        cutoff = now - self._window
        while attempts and attempts[0] <= cutoff:
            attempts.popleft()
        if len(attempts) >= limit:
            return Response(
                content='{"detail":"Too many authentication attempts. Try again later."}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": str(self._window)},
            )

        attempts.append(now)
        return await call_next(request)
