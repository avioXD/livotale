"""Generate scan appointment slots from org operating hours."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

DEFAULT_ORG_CITY = "default"
DEFAULT_OPEN = time(8, 0)
DEFAULT_CLOSE = time(18, 0)
DEFAULT_SLOT_MINUTES = 45


@dataclass(frozen=True, slots=True)
class SlotDef:
    code: str
    label: str
    hour: int
    minute: int


@dataclass(frozen=True, slots=True)
class OrgDayHours:
    open_time: time
    close_time: time
    slot_duration_minutes: int
    is_closed: bool


def _pad2(n: int) -> str:
    return f"{n:02d}"


def format_slot_label(hour: int, minute: int, duration_minutes: int = DEFAULT_SLOT_MINUTES) -> str:
    def fmt(h: int, m: int) -> str:
        ampm = "PM" if h >= 12 else "AM"
        hour12 = h % 12 or 12
        return f"{hour12}:{m:02d} {ampm}"

    end_total = hour * 60 + minute + duration_minutes
    end_hour, end_minute = divmod(end_total, 60)
    return f"{fmt(hour, minute)} – {fmt(end_hour, end_minute)}"


def build_slot_defs(open_time: time, close_time: time, duration_minutes: int) -> list[SlotDef]:
    slots: list[SlotDef] = []
    cursor = datetime.combine(date.today(), open_time)
    end = datetime.combine(date.today(), close_time)
    delta = timedelta(minutes=duration_minutes)

    while cursor + delta <= end:
        hour, minute = cursor.hour, cursor.minute
        code = f"{_pad2(hour)}:{_pad2(minute)}"
        slots.append(
            SlotDef(
                code=code,
                label=format_slot_label(hour, minute, duration_minutes),
                hour=hour,
                minute=minute,
            )
        )
        cursor += delta

    return slots


def compose_slot_datetime(date_str: str, slot_code: str, defs: list[SlotDef]) -> datetime | None:
    slot = next((s for s in defs if s.code == slot_code), None)
    if slot is None:
        return None
    try:
        d = date.fromisoformat(date_str)
    except ValueError:
        return None
    return datetime(d.year, d.month, d.day, slot.hour, slot.minute, tzinfo=UTC)


class SlotAvailabilityService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_day_hours(self, org_city: str, day_of_week: int) -> OrgDayHours:
        result = await self.db.execute(
            text(
                """
                SELECT open_time, close_time, slot_duration_minutes, is_closed
                FROM operations.org_operating_hours
                WHERE org_city = :city AND day_of_week = :dow
                """
            ),
            {"city": org_city, "dow": day_of_week},
        )
        row = result.mappings().first()
        if row is None:
            return OrgDayHours(
                open_time=DEFAULT_OPEN,
                close_time=DEFAULT_CLOSE,
                slot_duration_minutes=DEFAULT_SLOT_MINUTES,
                is_closed=day_of_week == 0,
            )
        return OrgDayHours(
            open_time=row["open_time"],
            close_time=row["close_time"],
            slot_duration_minutes=int(row["slot_duration_minutes"]),
            is_closed=bool(row["is_closed"]),
        )

    async def _count_bookings_at(
        self,
        scheduled_at: datetime,
        duration_minutes: int,
        *,
        exclude_order_id: UUID | None = None,
    ) -> int:
        window_start = scheduled_at - timedelta(minutes=duration_minutes)
        window_end = scheduled_at + timedelta(minutes=duration_minutes)
        params: dict[str, Any] = {
            "window_start": window_start,
            "window_end": window_end,
        }
        exclude_clause = ""
        if exclude_order_id is not None:
            exclude_clause = "AND o.id != :exclude_order_id"
            params["exclude_order_id"] = exclude_order_id

        result = await self.db.execute(
            text(
                f"""
                SELECT COUNT(DISTINCT o.technician_id) AS cnt
                FROM commerce.service_orders o
                WHERE o.scan_scheduled_at IS NOT NULL
                  AND o.scan_scheduled_at >= :window_start
                  AND o.scan_scheduled_at < :window_end
                  AND o.order_status NOT IN ('cancelled', 'completed')
                  AND o.deleted_at IS NULL
                  {exclude_clause}
                """
            ),
            params,
        )
        return int(result.scalar() or 0)

    async def _count_available_technicians(self) -> int:
        result = await self.db.execute(
            text(
                """
                SELECT COUNT(*) FROM operations.technicians t
                JOIN identity.users u ON u.id = t.user_id
                WHERE t.status = 'available' AND u.archived_at IS NULL
                """
            )
        )
        return int(result.scalar() or 0)

    async def get_scan_slots(
        self,
        date_str: str,
        *,
        org_city: str = DEFAULT_ORG_CITY,
        exclude_order_id: UUID | None = None,
        patient_preference: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        try:
            slot_date = date.fromisoformat(date_str)
        except ValueError:
            return []

        hours = await self.get_day_hours(org_city, slot_date.weekday())
        if hours.is_closed:
            return []

        defs = build_slot_defs(hours.open_time, hours.close_time, hours.slot_duration_minutes)
        total_techs = await self._count_available_technicians()
        now = datetime.now(UTC)

        pref_code = None
        if patient_preference and patient_preference.get("scanTimeSlot"):
            pref_raw = str(patient_preference["scanTimeSlot"])
            pref_code = pref_raw[:5] if ":" in pref_raw else pref_raw

        slots: list[dict[str, Any]] = []
        for slot_def in defs:
            scheduled_at = compose_slot_datetime(date_str, slot_def.code, defs)
            if scheduled_at is None:
                continue

            available = True
            if scheduled_at <= now:
                available = False
            elif total_techs > 0:
                booked = await self._count_bookings_at(
                    scheduled_at,
                    hours.slot_duration_minutes,
                    exclude_order_id=exclude_order_id,
                )
                if booked >= total_techs:
                    available = False

            entry: dict[str, Any] = {
                "code": slot_def.code,
                "label": slot_def.label,
                "available": available,
                "scheduledAt": scheduled_at.isoformat().replace("+00:00", "Z"),
            }
            if pref_code and pref_code == slot_def.code:
                entry["isPatientPreference"] = True
            slots.append(entry)

        return slots

    async def is_slot_available(
        self,
        scheduled_at: datetime,
        *,
        org_city: str = DEFAULT_ORG_CITY,
        exclude_order_id: UUID | None = None,
    ) -> bool:
        date_str = scheduled_at.date().isoformat()
        slots = await self.get_scan_slots(
            date_str,
            org_city=org_city,
            exclude_order_id=exclude_order_id,
        )
        target = scheduled_at.replace(second=0, microsecond=0)
        for slot in slots:
            slot_at = datetime.fromisoformat(slot["scheduledAt"].replace("Z", "+00:00"))
            if slot_at.replace(tzinfo=UTC) == target.replace(tzinfo=UTC) and slot["available"]:
                return True
        return False

    async def list_technicians_available_for_slot(
        self,
        scheduled_at: datetime,
        *,
        exclude_order_id: UUID | None = None,
    ) -> list[dict[str, Any]]:
        hours = await self.get_day_hours(DEFAULT_ORG_CITY, scheduled_at.date().weekday())
        window_start = scheduled_at - timedelta(minutes=hours.slot_duration_minutes)
        window_end = scheduled_at + timedelta(minutes=hours.slot_duration_minutes)
        params: dict[str, Any] = {
            "window_start": window_start,
            "window_end": window_end,
        }
        exclude_clause = ""
        if exclude_order_id is not None:
            exclude_clause = "AND o.id != :exclude_order_id"
            params["exclude_order_id"] = exclude_order_id

        result = await self.db.execute(
            text(
                f"""
                SELECT t.user_id AS id, u.full_name AS name,
                       COALESCE(MAX(sz.city_name), 'Unassigned') AS zone
                FROM operations.technicians t
                JOIN identity.users u ON u.id = t.user_id
                LEFT JOIN operations.technician_service_pincodes tsp
                  ON tsp.technician_id = t.id AND tsp.is_active = true
                LEFT JOIN operations.service_zones sz
                  ON sz.pincodes @> jsonb_build_array(tsp.pincode)
                WHERE t.status = 'available'
                  AND u.archived_at IS NULL
                  AND NOT EXISTS (
                    SELECT 1 FROM commerce.service_orders o
                    WHERE o.technician_id = t.user_id
                      AND o.scan_scheduled_at IS NOT NULL
                      AND o.scan_scheduled_at >= :window_start
                      AND o.scan_scheduled_at < :window_end
                      AND o.order_status NOT IN ('cancelled', 'completed')
                      AND o.deleted_at IS NULL
                      {exclude_clause}
                  )
                GROUP BY t.user_id, u.full_name
                ORDER BY u.full_name ASC
                """
            ),
            params,
        )
        return [
            {
                "id": str(row["id"]),
                "name": row["name"],
                "zone": row["zone"] or "Unassigned",
                "status": "available",
            }
            for row in result.mappings().all()
        ]
