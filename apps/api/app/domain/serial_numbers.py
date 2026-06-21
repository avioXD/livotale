from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.commerce import ServiceOrder
from app.models.operations import Enquiry


async def next_enquiry_number(session: AsyncSession) -> str:
    year = datetime.now(UTC).year
    prefix = f"ENQ-{year}-"
    result = await session.execute(
        select(func.count()).select_from(Enquiry).where(Enquiry.enquiry_number.like(f"{prefix}%"))
    )
    seq = int(result.scalar_one()) + 1
    return f"{prefix}{seq:04d}"


async def next_order_number(session: AsyncSession) -> str:
    year = datetime.now(UTC).year
    prefix = f"LFS-{year}-"
    result = await session.execute(
        select(func.count()).select_from(ServiceOrder).where(ServiceOrder.order_number.like(f"{prefix}%"))
    )
    seq = int(result.scalar_one()) + 1
    return f"{prefix}{seq:04d}"
