from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enquiry_thread import normalize_enquiry_phone, thread_id_from_phone
from app.models.operations import Enquiry, EnquiryFollowUpLog


class EnquiryRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self) -> list[Enquiry]:
        result = await self.session.execute(
            select(Enquiry)
            .where(Enquiry.deleted_at.is_(None))
            .order_by(Enquiry.enquiry_at.desc())
        )
        return list(result.scalars().all())

    async def list_by_phone(self, phone: str) -> list[Enquiry]:
        normalized = normalize_enquiry_phone(phone)
        result = await self.session.execute(
            select(Enquiry)
            .where(
                Enquiry.deleted_at.is_(None),
                func.regexp_replace(Enquiry.phone, r"\D", "", "g") == normalized,
            )
            .order_by(Enquiry.enquiry_at.asc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, enquiry_id: UUID) -> Enquiry | None:
        result = await self.session.execute(
            select(Enquiry).where(Enquiry.id == enquiry_id, Enquiry.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def search(
        self,
        *,
        status: str | None = None,
        source: str | None = None,
        search: str | None = None,
    ) -> list[Enquiry]:
        stmt = select(Enquiry).where(Enquiry.deleted_at.is_(None))
        if status:
            stmt = stmt.where(Enquiry.status == status)
        if source:
            stmt = stmt.where(Enquiry.source == source)
        if search:
            pattern = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    Enquiry.patient_name.ilike(pattern),
                    Enquiry.phone.ilike(pattern),
                    Enquiry.enquiry_number.ilike(pattern),
                )
            )
        stmt = stmt.order_by(Enquiry.enquiry_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def add(self, enquiry: Enquiry) -> Enquiry:
        self.session.add(enquiry)
        await self.session.flush()
        await self.session.refresh(enquiry)
        return enquiry

    async def save(self, enquiry: Enquiry) -> Enquiry:
        await self.session.flush()
        await self.session.refresh(enquiry)
        return enquiry

    async def list_follow_ups(self, enquiry_id: UUID) -> list[EnquiryFollowUpLog]:
        result = await self.session.execute(
            select(EnquiryFollowUpLog)
            .where(EnquiryFollowUpLog.enquiry_id == enquiry_id)
            .order_by(EnquiryFollowUpLog.created_at.asc())
        )
        return list(result.scalars().all())

    async def add_follow_up(self, log: EnquiryFollowUpLog) -> EnquiryFollowUpLog:
        self.session.add(log)
        await self.session.flush()
        await self.session.refresh(log)
        return log

    async def get_executive_name(self, user_id: UUID | None) -> str | None:
        if user_id is None:
            return None
        from sqlalchemy import text

        result = await self.session.execute(
            text("SELECT full_name FROM identity.users WHERE id = :user_id"),
            {"user_id": user_id},
        )
        row = result.mappings().first()
        return row["full_name"] if row else None

    async def get_package_code(self, package_id: UUID | None) -> str | None:
        if package_id is None:
            return None
        from app.models.commerce import LiverCarePackage

        result = await self.session.execute(
            select(LiverCarePackage.code).where(LiverCarePackage.id == package_id)
        )
        return result.scalar_one_or_none()

    def thread_id_for(self, enquiry: Enquiry) -> str:
        return thread_id_from_phone(enquiry.phone)

    async def thread_sequence_for(self, enquiry: Enquiry) -> int:
        siblings = await self.list_by_phone(enquiry.phone)
        if enquiry.id in {row.id for row in siblings}:
            siblings = [row for row in siblings if row.id != enquiry.id]
        return len(siblings) + 1

    async def count_thread(self, phone: str) -> int:
        return len(await self.list_by_phone(phone))
