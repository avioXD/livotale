from __future__ import annotations

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.utils.phone import normalize_phone


async def ensure_patient_portal_phone(db: AsyncSession, phone: str) -> str:
    """Ensure the phone belongs to an active patient portal account."""
    normalized = normalize_phone(phone)
    if not normalized:
        raise AppError("Phone number is required", status_code=400)

    result = await db.execute(
        text(
            """
            SELECT 1
            FROM clinical.patients pt
            JOIN identity.users u ON u.id = pt.user_id
            WHERE pt.status = 'active'
              AND right(regexp_replace(u.mobile, '\\D', '', 'g'), 10) = :phone
            LIMIT 1
            """
        ),
        {"phone": normalized},
    )
    if result.first() is None:
        raise AppError("No portal access for this phone number", status_code=403, error="forbidden")
    return normalized


async def resolve_patient_user_id(db: AsyncSession, phone: str) -> UUID:
    normalized = await ensure_patient_portal_phone(db, phone)
    result = await db.execute(
        text(
            """
            SELECT u.id
            FROM clinical.patients pt
            JOIN identity.users u ON u.id = pt.user_id
            WHERE pt.status = 'active'
              AND right(regexp_replace(u.mobile, '\\D', '', 'g'), 10) = :phone
            ORDER BY pt.created_at DESC
            LIMIT 1
            """
        ),
        {"phone": normalized},
    )
    row = result.first()
    if not row:
        raise AppError("Patient not found", status_code=404)
    return row[0]
