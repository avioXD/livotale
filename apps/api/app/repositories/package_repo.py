from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.commerce import LiverCarePackage


class PackageRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def count_all(self) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(LiverCarePackage).where(LiverCarePackage.deleted_at.is_(None))
        )
        return int(result.scalar_one())

    async def list_public(self) -> list[LiverCarePackage]:
        result = await self.session.execute(
            select(LiverCarePackage)
            .where(
                LiverCarePackage.deleted_at.is_(None),
                LiverCarePackage.active.is_(True),
                LiverCarePackage.visibility_web.is_(True),
            )
            .order_by(LiverCarePackage.sort_order.asc(), LiverCarePackage.code.asc())
        )
        return list(result.scalars().all())

    async def list_admin(self) -> list[LiverCarePackage]:
        result = await self.session.execute(
            select(LiverCarePackage)
            .where(LiverCarePackage.deleted_at.is_(None))
            .order_by(LiverCarePackage.updated_at.desc(), LiverCarePackage.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, package_id: UUID) -> LiverCarePackage | None:
        result = await self.session.execute(
            select(LiverCarePackage).where(
                LiverCarePackage.id == package_id,
                LiverCarePackage.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_code(self, code: str) -> LiverCarePackage | None:
        result = await self.session.execute(
            select(LiverCarePackage).where(
                LiverCarePackage.code == code,
                LiverCarePackage.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def code_exists(self, code: str, *, exclude_id: UUID | None = None) -> bool:
        stmt = select(LiverCarePackage.id).where(
            LiverCarePackage.code == code,
            LiverCarePackage.deleted_at.is_(None),
        )
        if exclude_id is not None:
            stmt = stmt.where(LiverCarePackage.id != exclude_id)
        result = await self.session.execute(stmt.limit(1))
        return result.scalar_one_or_none() is not None

    async def add(self, package: LiverCarePackage) -> LiverCarePackage:
        self.session.add(package)
        await self.session.flush()
        await self.session.refresh(package)
        return package

    async def save(self, package: LiverCarePackage) -> LiverCarePackage:
        await self.session.flush()
        await self.session.refresh(package)
        return package

    async def soft_delete(self, package: LiverCarePackage) -> None:
        package.deleted_at = datetime.now(UTC)
        await self.session.flush()
