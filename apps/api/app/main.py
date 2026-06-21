from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from starlette.requests import Request

from app.api.v1 import API_V1_PREFIX, api_router
from app.api.v1.routers.websocket import ws_hub
from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.exceptions import AppError, app_error_handler, http_exception_handler
from app.core.redis import connect_redis, disconnect_redis
from app.middleware.api_audit import ApiAuditMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.services.package_seed import seed_packages_if_empty

logger = logging.getLogger(__name__)

REQUIRED_SCHEMA_COLUMNS: tuple[tuple[str, str, str], ...] = (
    ("clinical", "doctors", "languages_known"),
    ("clinical", "patients", "preferred_language"),
)


async def _log_missing_schema_columns() -> list[str]:
    missing: list[str] = []
    try:
        async with SessionLocal() as session:
            for schema, table, column in REQUIRED_SCHEMA_COLUMNS:
                result = await session.execute(
                    text(
                        """
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = :schema
                          AND table_name = :table
                          AND column_name = :column
                        LIMIT 1
                        """
                    ),
                    {"schema": schema, "table": table, "column": column},
                )
                if result.scalar_one_or_none() is None:
                    missing.append(f"{schema}.{table}.{column}")
    except Exception as exc:
        logger.warning("Schema readiness check skipped: %s", exc)
        return missing
    return missing


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_redis()
    await ws_hub.start()
    missing_columns = await _log_missing_schema_columns()
    if missing_columns:
        message = (
            "Pending DB migration detected (039_doctor_languages). "
            "Run: npm run migrate OR uv run python scripts/apply_pending_migrations.py "
            f"Missing: {', '.join(missing_columns)}"
        )
        logger.error(message)
        app.state.schema_ready = False
        app.state.schema_message = message
    else:
        app.state.schema_ready = True
        app.state.schema_message = None
    if os.getenv("SEED_PACKAGES_ON_STARTUP", "true").lower() == "true":
        try:
            async with SessionLocal() as session:
                await seed_packages_if_empty(session)
                await session.commit()
        except Exception:
            pass  # DB may be unavailable in tests
    yield
    await ws_hub.shutdown()
    await disconnect_redis()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Livotale API",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(ApiAuditMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, _unhandled_exception_handler)
    from fastapi import HTTPException

    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, _validation_exception_handler)

    # Versioned API — /api/v1/{category}/...
    app.include_router(api_router, prefix=API_V1_PREFIX)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/health/ready")
    async def health_ready() -> JSONResponse:
        ready = getattr(app.state, "schema_ready", True)
        message = getattr(app.state, "schema_message", None)
        if ready:
            return JSONResponse(status_code=200, content={"status": "ready"})
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                "message": message or "Database schema is not up to date.",
            },
        )

    return app


async def _validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": "validation_error",
            "message": str(exc.errors()),
            "statusCode": 422,
        },
    )


async def _unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    message = str(exc)
    if any(token in message for token in ("UndefinedColumn", "does not exist", "ProgrammingError")):
        message = (
            "Database schema is out of date. Run migrations: "
            "cd apps/api && node scripts/run-migrations.js"
        )
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "message": message,
            "statusCode": 500,
        },
    )


app = create_app()
