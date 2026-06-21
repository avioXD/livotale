from __future__ import annotations

import asyncio
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.integrations.agents.orchestrator import ExtractionOrchestrator

_engine = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _session_maker() -> async_sessionmaker[AsyncSession]:
    global _engine, _session_factory
    if _session_factory is None:
        settings = get_settings()
        _engine = create_async_engine(settings.database_url, pool_pre_ping=True)
        _session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
    return _session_factory


async def process_ai_extraction_job(ctx: dict[str, Any], job_id: str) -> dict[str, str]:
    """Multi-agent extraction processor — parses, extracts, validates, and persists fields."""
    await asyncio.sleep(0.1)
    orchestrator = ExtractionOrchestrator()
    fields = await orchestrator.process(
        job_id=job_id,
        order_id=str(ctx.get("order_id", job_id)),
        source_type=str(ctx.get("source_type", "pathology_report")),
        source_file_id=ctx.get("source_file_id"),
    )

    session_factory = _session_maker()
    async with session_factory() as session:
        await session.execute(
            text(
                """
                UPDATE integrations.ai_extraction_jobs
                SET status = 'completed', updated_at = now()
                WHERE id = :job_id
                """
            ),
            {"job_id": UUID(job_id)},
        )
        for field in fields:
            await session.execute(
                text(
                    """
                    INSERT INTO integrations.extracted_fields (
                      job_id, field_name, extracted_value, unit, confidence_score, flag
                    )
                    VALUES (:job_id, :field_name, :extracted_value, :unit, :confidence_score, :flag)
                    ON CONFLICT DO NOTHING
                    """
                ),
                {
                    "job_id": UUID(job_id),
                    "field_name": field.field_name,
                    "extracted_value": field.extracted_value,
                    "unit": field.unit,
                    "confidence_score": float(field.confidence_score),
                    "flag": field.flag,
                },
            )
        await session.commit()
    return {"jobId": job_id, "status": "completed", "fieldCount": str(len(fields))}
