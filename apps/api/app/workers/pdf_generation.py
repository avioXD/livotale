from __future__ import annotations

import asyncio
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

_engine = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _session_maker() -> async_sessionmaker[AsyncSession]:
    global _engine, _session_factory
    if _session_factory is None:
        settings = get_settings()
        _engine = create_async_engine(settings.database_url, pool_pre_ping=True)
        _session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
    return _session_factory


async def generate_pdf_job(ctx: dict[str, Any], entity_type: str, entity_id: str) -> dict[str, str]:
    """Dummy PDF generation — writes a placeholder URL on supported entities."""
    await asyncio.sleep(0.1)
    pdf_url = f"https://files.livotale.local/{entity_type}/{entity_id}.pdf"
    session_factory = _session_maker()
    async with session_factory() as session:
        if entity_type == "final_report":
            await session.execute(
                text(
                    """
                    UPDATE clinical.final_reports
                    SET pdf_url = :pdf_url, status = 'generated', generated_at = now(), updated_at = now()
                    WHERE id = :entity_id
                    """
                ),
                {"pdf_url": pdf_url, "entity_id": UUID(entity_id)},
            )
        elif entity_type == "prescription":
            await session.execute(
                text(
                    """
                    UPDATE clinical.prescriptions
                    SET pdf_url = :pdf_url, updated_at = now()
                    WHERE id = :entity_id
                    """
                ),
                {"pdf_url": pdf_url, "entity_id": UUID(entity_id)},
            )
        await session.commit()
    return {"entityType": entity_type, "entityId": entity_id, "pdfUrl": pdf_url}
