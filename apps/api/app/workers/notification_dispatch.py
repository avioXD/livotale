from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.services.notification_service import NotificationService

_engine = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _session_maker() -> async_sessionmaker[AsyncSession]:
    global _engine, _session_factory
    if _session_factory is None:
        settings = get_settings()
        _engine = create_async_engine(settings.database_url, pool_pre_ping=True)
        _session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
    return _session_factory


async def dispatch_notifications(ctx: dict[str, Any]) -> dict[str, int]:
    """Process pending notification outbox rows and publish to Redis."""
    session_factory = _session_maker()
    async with session_factory() as session:
        service = NotificationService(session)
        processed = await service.process_pending_outbox(limit=50)
        await session.commit()
    return {"processed": processed}
