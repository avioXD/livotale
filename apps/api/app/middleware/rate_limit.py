"""Global HTTP rate limiting middleware."""

from __future__ import annotations

from fastapi import HTTPException
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.rate_limit import enforce_request_rate_limits


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # BaseHTTPMiddleware must not run rate limits on WebSocket handshakes.
        if request.scope.get("type") != "http":
            return await call_next(request)
        try:
            await enforce_request_rate_limits(request)
        except HTTPException as exc:
            # Middleware runs outside route handlers; return a response directly.
            headers = dict(exc.headers) if exc.headers else {}
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "error": "rate_limit_exceeded",
                    "message": str(exc.detail),
                    "statusCode": exc.status_code,
                },
                headers=headers,
            )
        return await call_next(request)
