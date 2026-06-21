from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.rbac import RoleCode
from app.services.staff_service import _ops_scope_from_meta


@dataclass
class PatientAccessScope:
    unrestricted: bool = False
    ops_pincodes: list[str] = field(default_factory=list)
    cm_pincodes: list[str] = field(default_factory=list)
    doctor_id: UUID | None = None

    def has_access_predicate(self) -> bool:
        return self.unrestricted or bool(self.ops_pincodes or self.cm_pincodes or self.doctor_id)


@dataclass
class DashboardScope:
    unrestricted: bool = False
    pincodes: list[str] = field(default_factory=list)
    city_names: list[str] = field(default_factory=list)

    def is_scoped(self) -> bool:
        return not self.unrestricted and bool(self.pincodes or self.city_names)


def build_order_pincode_exists_sql(*, order_alias: str = "commerce.service_orders") -> str:
    return f"""
        EXISTS (
          SELECT 1 FROM clinical.patient_addresses pa
          WHERE pa.patient_id = {order_alias}.patient_id
            AND pa.is_default = true
            AND pa.pincode = ANY(:scope_pincodes)
        )
    """.strip()


def build_sample_collection_scope_sql(*, sc_alias: str = "sc") -> str:
    return f"""
        EXISTS (
          SELECT 1
          FROM commerce.service_orders o
          JOIN clinical.patient_addresses pa
            ON pa.patient_id = o.patient_id
           AND pa.is_default = true
          WHERE o.id = {sc_alias}.order_id
            AND o.deleted_at IS NULL
            AND pa.pincode = ANY(:scope_pincodes)
        )
    """.strip()


def build_appointment_pincode_exists_sql(*, appointment_alias: str = "operations.appointments") -> str:
    return f"""
        EXISTS (
          SELECT 1 FROM clinical.patient_addresses pa
          WHERE pa.patient_id = {appointment_alias}.patient_id
            AND pa.is_default = true
            AND pa.pincode = ANY(:scope_pincodes)
        )
    """.strip()


async def resolve_dashboard_scope(
    session: AsyncSession,
    *,
    user_id: UUID | None,
    roles: list[str] | None,
    active_role: str | None = None,
) -> DashboardScope:
    effective = [active_role] if active_role else list(roles or [])
    role_set = set(effective or roles or [])
    scope = DashboardScope()

    if RoleCode.ADMIN.value in role_set:
        scope.unrestricted = True
        return scope

    if RoleCode.CITY_MANAGER.value not in role_set:
        scope.unrestricted = True
        return scope

    patient_scope = await resolve_patient_access_scope(session, user_id=user_id, roles=effective or roles)
    if not patient_scope.cm_pincodes:
        return scope

    scope.pincodes = list(patient_scope.cm_pincodes)
    zones_by_id = await load_zones_by_id(session)
    city_names: list[str] = []
    seen_cities: set[str] = set()
    for zone in zones_by_id.values():
        zone_pincodes = {str(pin) for pin in (zone.get("pincodes") or [])}
        if zone_pincodes.intersection(scope.pincodes):
            city = str(zone.get("city") or "")
            if city and city not in seen_cities:
                seen_cities.add(city)
                city_names.append(city)
    scope.city_names = city_names
    return scope


def pincodes_for_zone_ids(zone_ids: list[str], zones_by_id: dict[str, dict[str, Any]]) -> list[str]:
    pincodes: list[str] = []
    seen: set[str] = set()
    for zone_id in zone_ids:
        zone = zones_by_id.get(zone_id)
        if not zone:
            continue
        for pin in zone.get("pincodes") or []:
            pin_str = str(pin)
            if pin_str not in seen:
                seen.add(pin_str)
                pincodes.append(pin_str)
    return pincodes


async def load_zones_by_id(session: AsyncSession) -> dict[str, dict[str, Any]]:
    result = await session.execute(
        text(
            """
            SELECT id, city_name, state_name, pincodes, active
            FROM operations.service_zones
            WHERE active = true
            """
        )
    )
    zones_by_id: dict[str, dict[str, Any]] = {}
    for row in result.mappings().all():
        zone_id = str(row["id"])
        zones_by_id[zone_id] = {
            "id": zone_id,
            "city": row["city_name"],
            "state": row["state_name"],
            "pincodes": list(row["pincodes"] or []),
            "active": row["active"],
        }
    return zones_by_id


async def load_ops_meta(session: AsyncSession, user_id: UUID) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            SELECT meta
            FROM operations.staff_hr_profiles
            WHERE user_id = :user_id AND role = 'operations'
            ORDER BY updated_at DESC
            LIMIT 1
            """
        ),
        {"user_id": user_id},
    )
    row = result.mappings().first()
    if not row:
        return {}
    meta = row["meta"]
    return dict(meta) if isinstance(meta, dict) else {}


async def get_doctor_id(session: AsyncSession, user_id: UUID | None) -> UUID | None:
    if user_id is None:
        return None
    result = await session.execute(
        text(
            """
            SELECT id FROM clinical.doctors
            WHERE user_id = :user_id AND status = 'active'
            ORDER BY created_at DESC LIMIT 1
            """
        ),
        {"user_id": user_id},
    )
    row = result.first()
    return row[0] if row else None


async def resolve_patient_access_scope(
    session: AsyncSession,
    *,
    user_id: UUID | None,
    roles: list[str] | None,
) -> PatientAccessScope:
    role_set = set(roles or [])
    scope = PatientAccessScope()

    if RoleCode.ADMIN.value in role_set:
        scope.unrestricted = True
        return scope

    zones_by_id = await load_zones_by_id(session)
    meta = await load_ops_meta(session, user_id) if user_id else {}
    parsed = _ops_scope_from_meta(meta, zones_by_id)

    if RoleCode.SUPPORT.value in role_set:
        ops_pins = set(parsed.get("pincodes") or [])
        ops_pins.update(pincodes_for_zone_ids(parsed.get("assigned_service_zone_ids") or [], zones_by_id))
        scope.ops_pincodes = sorted(ops_pins)

    if RoleCode.CITY_MANAGER.value in role_set:
        scope.cm_pincodes = pincodes_for_zone_ids(
            parsed.get("city_manager_service_zone_ids") or [],
            zones_by_id,
        )

    if RoleCode.DOCTOR.value in role_set:
        scope.doctor_id = await get_doctor_id(session, user_id)

    return scope


def build_patient_access_sql(
    scope: PatientAccessScope,
    params: dict[str, Any],
    *,
    patient_id_expr: str = "pds.patient_id",
) -> str:
    """Return SQL AND-clause for patient access, or empty string if unrestricted."""
    if scope.unrestricted:
        return ""

    clauses: list[str] = []

    if scope.ops_pincodes:
        params["ops_pincodes"] = scope.ops_pincodes
        clauses.append(
            f"""
            EXISTS (
              SELECT 1 FROM clinical.patient_addresses pa
              WHERE pa.patient_id = {patient_id_expr}
                AND pa.is_default = true
                AND pa.pincode = ANY(:ops_pincodes)
            )
            """.strip()
        )

    if scope.cm_pincodes:
        params["cm_pincodes"] = scope.cm_pincodes
        clauses.append(
            f"""
            EXISTS (
              SELECT 1 FROM clinical.patient_addresses pa
              WHERE pa.patient_id = {patient_id_expr}
                AND pa.is_default = true
                AND pa.pincode = ANY(:cm_pincodes)
            )
            """.strip()
        )

    if scope.doctor_id is not None:
        params["scope_doctor_id"] = scope.doctor_id
        clauses.append(
            f"""
            (
              EXISTS (
                SELECT 1 FROM clinical.doctor_patient_assignments dpa
                WHERE dpa.patient_id = {patient_id_expr}
                  AND dpa.doctor_id = :scope_doctor_id
                  AND dpa.status = 'active'
              )
              OR EXISTS (
                SELECT 1 FROM commerce.service_orders o
                WHERE o.patient_id = {patient_id_expr}
                  AND o.doctor_id = :scope_doctor_id
                  AND o.deleted_at IS NULL
              )
            )
            """.strip()
        )

    if not clauses:
        return "AND FALSE"

    return "AND (" + " OR ".join(clauses) + ")"


async def patient_matches_scope(
    session: AsyncSession,
    *,
    patient_id: UUID,
    scope: PatientAccessScope,
) -> bool:
    if scope.unrestricted:
        return True
    if not scope.has_access_predicate():
        return False

    params: dict[str, Any] = {"patient_id": patient_id}
    access_sql = build_patient_access_sql(scope, params, patient_id_expr=":patient_id")
    result = await session.execute(
        text(f"SELECT 1 WHERE TRUE {access_sql}"),
        params,
    )
    return result.first() is not None
