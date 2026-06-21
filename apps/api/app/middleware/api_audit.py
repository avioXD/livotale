from __future__ import annotations

import time
from uuid import UUID

from jose import JWTError
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.api.deps import request_meta
from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.security import verify_access_token
from app.services.audit_service import AuditService

_SKIP_PATHS = frozenset({"/health", "/docs", "/openapi.json", "/redoc", "/favicon.ico"})
_SKIP_PREFIXES = ("/docs/",)


def _should_skip_audit(path: str) -> bool:
    if path in _SKIP_PATHS:
        return True
    return any(path.startswith(prefix) for prefix in _SKIP_PREFIXES)


def _extract_user_id(request: Request) -> UUID | None:
    authorization = request.headers.get("authorization")
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    try:
        payload = verify_access_token(token)
        subject = payload.get("sub")
        return UUID(subject) if subject else None
    except (JWTError, ValueError, TypeError):
        return None


class ApiAuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        settings = get_settings()
        if not settings.api_audit_logging:
            return await call_next(request)

        path = request.url.path
        if _should_skip_audit(path):
            return await call_next(request)

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = int((time.perf_counter() - start) * 1000)

        meta = request_meta(request)
        metadata: dict[str, object] = {
            "method": request.method,
            "path": path,
            "statusCode": response.status_code,
            "durationMs": duration_ms,
        }
        if request.query_params:
            metadata["query"] = dict(request.query_params)

        try:
            async with SessionLocal() as session:
                audit = AuditService(session)
                await audit.log_activity(
                    _extract_user_id(request),
                    "api.request",
                    ip_address=meta["ip_address"],
                    user_agent=meta["user_agent"],
                    metadata=metadata,
                )
                await session.commit()
        except Exception:
            pass

        return response
