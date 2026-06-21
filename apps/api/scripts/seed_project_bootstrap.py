#!/usr/bin/env python3
"""Idempotent project bootstrap: Kolkata ops users, service zone, and lab partner."""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

sys.path.insert(0, str(Path(__file__).resolve().parent))

from bootstrap_constants import (
    BOOTSTRAP_IDS,
    BOOTSTRAP_USERS,
    DOCTOR_REGISTRATION,
    KOLKATA_CITY,
    LAB_PARTNER_REGISTRATION,
    SERVICE_ZONE_NAME,
    TECHNICIAN_EMPLOYEE_CODE,
    kolkata_pincodes,
)
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.services.package_seed import seed_packages_if_empty


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


async def seed_bootstrap_users(session: AsyncSession) -> tuple[int, dict[str, UUID]]:
    created = 0
    user_ids: dict[str, UUID] = {}
    for username, password, full_name, role_code, email in BOOTSTRAP_USERS:
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
        user_ids[role_code] = user_id
        await _assign_role(session, user_id, role_code)

    # Demo multi-role account: operations user can also sign in as doctor.
    ops_id = user_ids.get("support")
    if ops_id:
        await _assign_role(session, ops_id, "doctor")

    return created, user_ids


async def _seed_doctor_profile(
    session: AsyncSession,
    user_id: UUID,
    *,
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
                  role, member_id, user_id, verification_status, employment_status
                )
                VALUES (
                  'doctor'::operations.staff_hr_role_enum, :member_id, :user_id, 'verified', 'active'
                )
                ON CONFLICT (role, member_id) DO UPDATE
                SET verification_status = 'verified', employment_status = 'active'
                """
            ),
            {"member_id": doctor_id, "user_id": user_id},
        )


async def _seed_technician_profile(
    session: AsyncSession, user_id: UUID, city_id: UUID
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
            SET verification_status = 'verified',
                status = 'available',
                service_zone = EXCLUDED.service_zone,
                city_id = EXCLUDED.city_id
            """
        ),
        {
            "id": BOOTSTRAP_IDS["technician"],
            "user_id": user_id,
            "employee_code": TECHNICIAN_EMPLOYEE_CODE,
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


async def _seed_ops_hr_profile(session: AsyncSession, user_id: UUID) -> None:
    await session.execute(
        text(
            """
            INSERT INTO operations.staff_hr_profiles (
              role, member_id, user_id, verification_status, employment_status
            )
            VALUES (
              'operations'::operations.staff_hr_role_enum, :member_id, :user_id, 'verified', 'active'
            )
            ON CONFLICT (role, member_id) DO UPDATE
            SET verification_status = 'verified', employment_status = 'active'
            """
        ),
        {"member_id": user_id, "user_id": user_id},
    )


async def _seed_lab_partner_org(
    session: AsyncSession, user_id: UUID, city_id: UUID
) -> tuple[bool, UUID]:
    existing = await session.execute(
        text(
            """
            SELECT id FROM operations.lab_partners
            WHERE id = :id OR registration_number = :registration_number
            LIMIT 1
            """
        ),
        {"id": BOOTSTRAP_IDS["lab_partner"], "registration_number": LAB_PARTNER_REGISTRATION},
    )
    existing_id = existing.scalar_one_or_none()
    created = existing_id is None
    lab_id = existing_id or BOOTSTRAP_IDS["lab_partner"]
    await session.execute(
        text(
            """
            INSERT INTO operations.lab_partners (
              id, name, contact_user_id, city_id, registration_number,
              contact_number, email, status
            )
            VALUES (
              :id, :name, :contact_user_id, :city_id, :registration_number,
              '+913300000001', :email, 'active'
            )
            ON CONFLICT (id) DO UPDATE
            SET name = EXCLUDED.name,
                contact_user_id = EXCLUDED.contact_user_id,
                city_id = EXCLUDED.city_id,
                registration_number = EXCLUDED.registration_number,
                email = EXCLUDED.email,
                status = 'active'
            """
        ),
        {
            "id": lab_id,
            "name": "Livotale Kolkata Lab Partner",
            "contact_user_id": user_id,
            "city_id": city_id,
            "registration_number": LAB_PARTNER_REGISTRATION,
            "email": "labpartner@livotale.com",
        },
    )
    await session.execute(
        text(
            """
            INSERT INTO operations.staff_hr_profiles (
              role, member_id, user_id, verification_status, employment_status,
              registration_number, clinic_or_org_name
            )
            VALUES (
              'lab_partner'::operations.staff_hr_role_enum, :member_id, :user_id,
              'verified', 'active', :registration_number, :org_name
            )
            ON CONFLICT (role, member_id) DO UPDATE
            SET user_id = EXCLUDED.user_id,
                verification_status = 'verified',
                employment_status = 'active',
                registration_number = EXCLUDED.registration_number,
                clinic_or_org_name = EXCLUDED.clinic_or_org_name
            """
        ),
        {
            "member_id": lab_id,
            "user_id": user_id,
            "registration_number": LAB_PARTNER_REGISTRATION,
            "org_name": "Livotale Kolkata Lab Partner",
        },
    )
    return created, lab_id


async def seed_role_profiles(
    session: AsyncSession, user_ids: dict[str, UUID], city_id: UUID
) -> dict[str, Any]:
    stats: dict[str, Any] = {"lab_partner_created": False}
    if "doctor" in user_ids:
        await _seed_doctor_profile(
            session,
            user_ids["doctor"],
            doctor_id=BOOTSTRAP_IDS["doctor"],
            registration_number=DOCTOR_REGISTRATION,
        )
    if "support" in user_ids:
        await _seed_doctor_profile(session, user_ids["support"])
    if "technician" in user_ids:
        stats["technician_id"] = await _seed_technician_profile(
            session, user_ids["technician"], city_id
        )
    for role_code in ("admin", "support"):
        if role_code in user_ids:
            await _seed_ops_hr_profile(session, user_ids[role_code])
    if "lab_partner" in user_ids:
        created, _ = await _seed_lab_partner_org(session, user_ids["lab_partner"], city_id)
        stats["lab_partner_created"] = created
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
            pkg_count = await seed_packages_if_empty(session)
            city_id = await ensure_kolkata_city(session)
            users_created, user_ids = await seed_bootstrap_users(session)
            profile_stats = await seed_role_profiles(session, user_ids, city_id)
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
        f"lab_partner={'created' if profile_stats.get('lab_partner_created') else 'ensured'}, "
        f"technician_pincodes_synced={pincode_synced}"
    )


if __name__ == "__main__":
    asyncio.run(main())
