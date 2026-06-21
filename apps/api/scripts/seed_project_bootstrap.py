#!/usr/bin/env python3
"""Idempotent project bootstrap: staff users, Kolkata service zone, and packages."""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bootstrap_constants import (
    BOOTSTRAP_IDS,
    BOOTSTRAP_USERS,
    DOCTOR_REGISTRATION,
    KOLKATA_CITY,
    SERVICE_ZONE_NAME,
    kolkata_pincodes,
)
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.services.package_seed import sync_seed_packages


async def ensure_kolkata_city(session: AsyncSession) -> UUID:
    name, state, country = KOLKATA_CITY
    await session.execute(
        text(
            """
            INSERT INTO core.cities (name, state, country)
            VALUES (:name, :state, :country)
            ON CONFLICT (name, state, country) DO NOTHING
            """
        ),
        {"name": name, "state": state, "country": country},
    )
    result = await session.execute(
        text(
            """
            SELECT id FROM core.cities
            WHERE name = :name AND state = :state AND country = :country
            LIMIT 1
            """
        ),
        {"name": name, "state": state, "country": country},
    )
    city_id = result.scalar_one()
    return city_id


async def _role_id(session: AsyncSession, role_code: str) -> UUID | None:
    result = await session.execute(
        text("SELECT id FROM identity.roles WHERE code = :code LIMIT 1"),
        {"code": role_code},
    )
    return result.scalar_one_or_none()


async def _user_id_by_username(session: AsyncSession, username: str) -> UUID | None:
    result = await session.execute(
        text("SELECT id FROM identity.users WHERE username = :username LIMIT 1"),
        {"username": username},
    )
    return result.scalar_one_or_none()


async def _assign_role(session: AsyncSession, user_id: UUID, role_code: str) -> bool:
    role_id = await _role_id(session, role_code)
    if not role_id:
        return False
    existing = await session.execute(
        text(
            """
            SELECT 1 FROM identity.user_roles
            WHERE user_id = :user_id AND role_id = :role_id AND ends_at IS NULL
            LIMIT 1
            """
        ),
        {"user_id": user_id, "role_id": role_id},
    )
    if existing.scalar_one_or_none():
        return False
    primary = await session.execute(
        text(
            """
            SELECT 1 FROM identity.user_roles
            WHERE user_id = :user_id AND is_primary = true AND ends_at IS NULL
            LIMIT 1
            """
        ),
        {"user_id": user_id},
    )
    is_primary = primary.scalar_one_or_none() is None
    await session.execute(
        text(
            """
            INSERT INTO identity.user_roles (user_id, role_id, is_primary)
            VALUES (:user_id, :role_id, :is_primary)
            """
        ),
        {"user_id": user_id, "role_id": role_id, "is_primary": is_primary},
    )
    return True


async def _ensure_staff_profile(
    session: AsyncSession,
    user_id: UUID,
    *,
    employee_code: str,
    city_id: UUID,
    designation: str,
) -> None:
    await session.execute(
        text(
            """
            INSERT INTO identity.staff_profiles (user_id, employee_code, city_id, designation, status)
            VALUES (:user_id, :employee_code, :city_id, :designation, 'active')
            ON CONFLICT (user_id) DO UPDATE
            SET employee_code = EXCLUDED.employee_code,
                city_id = EXCLUDED.city_id,
                designation = EXCLUDED.designation,
                status = 'active'
            """
        ),
        {
            "user_id": user_id,
            "employee_code": employee_code,
            "city_id": city_id,
            "designation": designation,
        },
    )


async def seed_bootstrap_users(
    session: AsyncSession, city_id: UUID
) -> tuple[int, dict[str, list[UUID]], dict[UUID, str]]:
    created = 0
    user_ids: dict[str, list[UUID]] = {}
    employee_codes: dict[UUID, str] = {}
    for username, password, full_name, role_code, email, employee_code in BOOTSTRAP_USERS:
        user_id = await _user_id_by_username(session, username)
        if user_id:
            await session.execute(
                text(
                    """
                    UPDATE identity.users
                    SET email = :email, full_name = :full_name, status = 'active', archived_at = NULL
                    WHERE username = :username
                    """
                ),
                {"username": username, "email": email, "full_name": full_name},
            )
        else:
            user_id = uuid4()
            await session.execute(
                text(
                    """
                    INSERT INTO identity.users (id, username, password_hash, full_name, email, status)
                    VALUES (:id, :username, :password_hash, :full_name, :email, 'active')
                    """
                ),
                {
                    "id": user_id,
                    "username": username,
                    "password_hash": hash_password(password),
                    "full_name": full_name,
                    "email": email,
                },
            )
            created += 1
        user_ids.setdefault(role_code, []).append(user_id)
        employee_codes[user_id] = employee_code
        await _assign_role(session, user_id, role_code)
        await _ensure_staff_profile(
            session,
            user_id,
            employee_code=employee_code,
            city_id=city_id,
            designation={
                "admin": "Super Admin",
                "support": "Operations",
                "doctor": "Doctor",
                "technician": "Technician",
            }.get(role_code, role_code),
        )

    return created, user_ids, employee_codes


async def _seed_doctor_profile(
    session: AsyncSession,
    user_id: UUID,
    *,
    employee_code: str,
    doctor_id: UUID | None = None,
    registration_number: str | None = None,
) -> None:
    entity_id = doctor_id or uuid4()
    reg_number = registration_number or f"LIV-KOL-DOC-{str(user_id)[:8].upper()}"
    await session.execute(
        text(
            """
            INSERT INTO clinical.doctors (id, user_id, registration_number, qualification, status, languages_known)
            VALUES (:id, :user_id, :registration_number, 'DM MD', 'active', ARRAY['English', 'Hindi', 'Bengali']::text[])
            ON CONFLICT (user_id) DO UPDATE
            SET registration_number = EXCLUDED.registration_number,
                status = 'active',
                languages_known = EXCLUDED.languages_known
            """
        ),
        {
            "id": entity_id,
            "user_id": user_id,
            "registration_number": reg_number,
        },
    )
    doc_row = await session.execute(
        text("SELECT id FROM clinical.doctors WHERE user_id = :user_id LIMIT 1"),
        {"user_id": user_id},
    )
    doctor_id = doc_row.scalar_one_or_none()
    if doctor_id:
        await session.execute(
            text(
                """
                INSERT INTO operations.staff_hr_profiles (
                  role, member_id, user_id, employee_code, verification_status, employment_status
                )
                VALUES (
                  'doctor'::operations.staff_hr_role_enum, :member_id, :user_id, :employee_code, 'verified', 'active'
                )
                ON CONFLICT (role, member_id) DO UPDATE
                SET user_id = EXCLUDED.user_id,
                    employee_code = EXCLUDED.employee_code,
                    verification_status = 'verified',
                    employment_status = 'active'
                """
            ),
            {"member_id": doctor_id, "user_id": user_id, "employee_code": employee_code},
        )


async def _seed_technician_profile(
    session: AsyncSession, user_id: UUID, city_id: UUID, *, employee_code: str
) -> UUID | None:
    await session.execute(
        text(
            """
            INSERT INTO operations.technicians (
              id, user_id, employee_code, city_id, verification_status, status, service_zone
            )
            VALUES (
              :id, :user_id, :employee_code, :city_id, 'verified', 'available', :service_zone
            )
            ON CONFLICT (user_id) DO UPDATE
            SET employee_code = EXCLUDED.employee_code,
                verification_status = 'verified',
                status = 'available',
                service_zone = EXCLUDED.service_zone,
                city_id = EXCLUDED.city_id
            """
        ),
        {
            "id": BOOTSTRAP_IDS["technician"],
            "user_id": user_id,
            "employee_code": employee_code,
            "city_id": city_id,
            "service_zone": SERVICE_ZONE_NAME,
        },
    )
    tech_row = await session.execute(
        text("SELECT id FROM operations.technicians WHERE user_id = :user_id LIMIT 1"),
        {"user_id": user_id},
    )
    tech_id = tech_row.scalar_one_or_none()
    if tech_id:
        await session.execute(
            text(
                """
                INSERT INTO operations.technician_employee_profiles (technician_id)
                VALUES (:technician_id)
                ON CONFLICT (technician_id) DO NOTHING
                """
            ),
            {"technician_id": tech_id},
        )
    return tech_id


async def _seed_ops_hr_profile(session: AsyncSession, user_id: UUID, *, employee_code: str) -> None:
    await session.execute(
        text(
            """
            INSERT INTO operations.staff_hr_profiles (
              role, member_id, user_id, employee_code, verification_status, employment_status
            )
            VALUES (
              'operations'::operations.staff_hr_role_enum, :member_id, :user_id, :employee_code, 'verified', 'active'
            )
            ON CONFLICT (role, member_id) DO UPDATE
            SET user_id = EXCLUDED.user_id,
                employee_code = EXCLUDED.employee_code,
                verification_status = 'verified',
                employment_status = 'active'
            """
        ),
        {"member_id": user_id, "user_id": user_id, "employee_code": employee_code},
    )


async def seed_role_profiles(
    session: AsyncSession,
    user_ids: dict[str, list[UUID]],
    city_id: UUID,
    employee_codes: dict[UUID, str],
) -> dict[str, Any]:
    stats: dict[str, Any] = {}
    if user_ids.get("doctor"):
        await _seed_doctor_profile(
            session,
            user_ids["doctor"][0],
            employee_code=employee_codes[user_ids["doctor"][0]],
            doctor_id=BOOTSTRAP_IDS["doctor"],
            registration_number=DOCTOR_REGISTRATION,
        )
    if user_ids.get("technician"):
        stats["technician_id"] = await _seed_technician_profile(
            session,
            user_ids["technician"][0],
            city_id,
            employee_code=employee_codes[user_ids["technician"][0]],
        )
    for role_code in ("admin", "support"):
        for user_id in user_ids.get(role_code, []):
            await _seed_ops_hr_profile(session, user_id, employee_code=employee_codes[user_id])
    return stats


async def ensure_kolkata_service_zone(session: AsyncSession, pincodes: list[str]) -> tuple[bool, int]:
    name, state, _country = KOLKATA_CITY
    existing = await session.execute(
        text(
            """
            SELECT id, pincodes FROM operations.service_zones
            WHERE city_name = :city_name AND state_name = :state_name
            LIMIT 1
            """
        ),
        {"city_name": name, "state_name": state},
    )
    row = existing.mappings().first()
    if row:
        current = row["pincodes"] or []
        if isinstance(current, str):
            current = json.loads(current)
        merged = sorted(set(current) | set(pincodes))
        added = len(merged) - len(current)
        if added > 0:
            await session.execute(
                text(
                    """
                    UPDATE operations.service_zones
                    SET pincodes = CAST(:pincodes AS jsonb), active = true
                    WHERE id = :id
                    """
                ),
                {"id": row["id"], "pincodes": json.dumps(merged)},
            )
        return False, added
    await session.execute(
        text(
            """
            INSERT INTO operations.service_zones (id, city_name, state_name, pincodes, active)
            VALUES (:id, :city_name, :state_name, CAST(:pincodes AS jsonb), true)
            """
        ),
        {
            "id": BOOTSTRAP_IDS["service_zone"],
            "city_name": name,
            "state_name": state,
            "pincodes": json.dumps(pincodes),
        },
    )
    return True, len(pincodes)


async def sync_technician_pincodes(
    session: AsyncSession, technician_id: UUID, pincodes: list[str]
) -> int:
    synced = 0
    for pincode in pincodes:
        result = await session.execute(
            text(
                """
                INSERT INTO operations.technician_service_pincodes (technician_id, pincode, is_active)
                VALUES (:technician_id, :pincode, true)
                ON CONFLICT (technician_id, pincode) DO UPDATE SET is_active = true
                RETURNING (xmax = 0) AS inserted
                """
            ),
            {"technician_id": technician_id, "pincode": pincode},
        )
        row = result.first()
        if row and row[0]:
            synced += 1
    return synced


async def main() -> None:
    pincodes = kolkata_pincodes()
    async with SessionLocal() as session:
        async with session.begin():
            pkg_count = await sync_seed_packages(session)
            city_id = await ensure_kolkata_city(session)
            users_created, user_ids, employee_codes = await seed_bootstrap_users(session, city_id)
            profile_stats = await seed_role_profiles(session, user_ids, city_id, employee_codes)
            zone_created, zone_pincodes_added = await ensure_kolkata_service_zone(session, pincodes)
            technician_id = profile_stats.get("technician_id")
            pincode_synced = 0
            if technician_id:
                pincode_synced = await sync_technician_pincodes(session, technician_id, pincodes)

    print(
        "Bootstrap complete: "
        f"packages={pkg_count} created, "
        f"users={users_created} created, "
        f"zone={'created' if zone_created else 'ensured'}, "
        f"zone_pincodes_added={zone_pincodes_added}, "
        f"technician_pincodes_synced={pincode_synced}"
    )


if __name__ == "__main__":
    asyncio.run(main())
