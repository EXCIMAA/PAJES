"""CSRF protection middleware.

Uses the double-submit cookie pattern: on GET requests a CSRF token cookie
is set; mutating requests (POST/PUT/PATCH/DELETE) must include the same
token in a header. Bearer-token auth (no cookie) is exempt since browsers
don't auto-send Authorization headers.

The double-submit token also protects unauthenticated auth endpoints, including
login, signup, activation, and password recovery.
"""

from __future__ import annotations

import hmac
import secrets

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings

MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Always set a CSRF cookie on GET requests so the client has a token
        if request.method == "GET":
            response: Response = await call_next(request)
            token = request.cookies.get(settings.csrf_cookie_name)
            if not token:
                token = secrets.token_hex(32)
                response.set_cookie(
                    key=settings.csrf_cookie_name,
                    value=token,
                    httponly=False,  # Must be readable by JS
                    secure=settings.secure_auth_cookies,
                    samesite="lax",
                    path="/",
                )
            response.headers[settings.csrf_header_name] = token
            return response

        if not settings.csrf_enabled:
            return await call_next(request)

        if request.method not in MUTATING_METHODS:
            return await call_next(request)

        # Double-submit: cookie token must match header token
        cookie_token = request.cookies.get(settings.csrf_cookie_name, "")
        header_token = request.headers.get(settings.csrf_header_name, "")

        if not cookie_token or not header_token:
            return Response(
                content='{"detail":"CSRF token missing"}',
                status_code=403,
                media_type="application/json",
            )

        if not hmac.compare_digest(cookie_token, header_token):
            return Response(
                content='{"detail":"CSRF token mismatch"}',
                status_code=403,
                media_type="application/json",
            )

        return await call_next(request)
