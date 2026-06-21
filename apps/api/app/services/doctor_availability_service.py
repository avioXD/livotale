from __future__ import annotations

import json
from datetime import UTC, date, datetime, timedelta
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError

IST = ZoneInfo("Asia/Kolkata")

ACTIVE_APPOINTMENT_STATUSES = (
    "draft",
    "pending_payment",
    "booked",
    "confirmed",
    "doctor_assigned",
    "technician_assigned",
    "reminder_sent",
    "patient_confirmed",
    "technician_on_the_way",
    "technician_arrived",
    "sample_collected",
    "report_pending",
    "report_uploaded",
    "waiting_for_doctor",
    "consultation_started",
    "prescription_drafted",
    "prescription_approved",
    "rescheduled",
    "follow_up_required",
)


def parse_time_to_minutes(time_str: str) -> int:
    parts = str(time_str)[:5].split(":")
    return int(parts[0]) * 60 + int(parts[1])


def minutes_to_time(total_minutes: int) -> str:
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return f"{hours:02d}:{minutes:02d}:00"


def _parse_slot_date(slot_date: str) -> date:
    return date.fromisoformat(slot_date)


def _day_of_week_for_date(date_str: str) -> int:
    year, month, day = (int(part) for part in date_str.split("-"))
    return (datetime(year, month, day).weekday() + 1) % 7


def _slot_type_for_visit_mode(visit_mode: str) -> str:
    if visit_mode == "tele":
        return "tele"
    if visit_mode == "home":
        return "home_review"
    return "clinic"


def _format_slot_label(start_time: str, end_time: str) -> str:
    def fmt(value: str) -> str:
        hours, minutes = (int(part) for part in str(value)[:5].split(":"))
        ampm = "PM" if hours >= 12 else "AM"
        hour12 = hours % 12 or 12
        return f"{hour12}:{minutes:02d} {ampm}"

    return f"{fmt(start_time)} – {fmt(end_time)}"


class DoctorAvailabilityService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def assert_doctor_exists(self, doctor_id: UUID) -> None:
        result = await self.db.execute(
            text("SELECT id FROM clinical.doctors WHERE id = :doctor_id"),
            {"doctor_id": doctor_id},
        )
        if not result.scalar_one_or_none():
            raise AppError("Doctor not found", status_code=404)

    async def get_availability(self, doctor_id: UUID) -> dict[str, Any]:
        await self.assert_doctor_exists(doctor_id)
        rules_result = await self.db.execute(
            text(
                """
                SELECT id, day_of_week, start_time, end_time, slot_duration_minutes, buffer_minutes,
                       max_appointments_per_day, visit_modes, effective_from, effective_to, is_active
                FROM operations.doctor_availability
                WHERE doctor_id = :doctor_id AND is_active = true
                ORDER BY day_of_week, start_time
                """
            ),
            {"doctor_id": doctor_id},
        )
        exceptions_result = await self.db.execute(
            text(
                """
                SELECT id, exception_date, is_blocked, start_time, end_time, reason
                FROM operations.doctor_availability_exceptions
                WHERE doctor_id = :doctor_id
                  AND exception_date >= CURRENT_DATE - INTERVAL '7 days'
                ORDER BY exception_date ASC
                """
            ),
            {"doctor_id": doctor_id},
        )
        return {
            "rules": [self._map_rule_row(dict(row)) for row in rules_result.mappings().all()],
            "exceptions": [self._map_exception_row(dict(row)) for row in exceptions_result.mappings().all()],
        }

    async def replace_availability(self, doctor_id: UUID, rules: list[dict[str, Any]]) -> dict[str, Any]:
        await self.assert_doctor_exists(doctor_id)
        if not isinstance(rules, list):
            raise AppError("rules array is required", status_code=400)

        await self.db.execute(
            text(
                """
                UPDATE operations.doctor_availability
                SET is_active = false, updated_at = now()
                WHERE doctor_id = :doctor_id
                """
            ),
            {"doctor_id": doctor_id},
        )

        today = date.today()
        for rule in rules:
            day_of_week = rule.get("dayOfWeek", rule.get("day_of_week"))
            start_time = rule.get("startTime", rule.get("start_time"))
            end_time = rule.get("endTime", rule.get("end_time"))
            if day_of_week is None or not start_time or not end_time:
                raise AppError("Each rule needs dayOfWeek, startTime, endTime", status_code=400)

            visit_modes = rule.get("visitModes", rule.get("visit_modes")) or ["clinic", "tele"]
            await self.db.execute(
                text(
                    """
                    INSERT INTO operations.doctor_availability (
                      doctor_id, day_of_week, start_time, end_time,
                      slot_duration_minutes, buffer_minutes, max_appointments_per_day,
                      visit_modes, effective_from, effective_to, is_active
                    ) VALUES (
                      :doctor_id, :day_of_week, :start_time, :end_time,
                      :slot_duration_minutes, :buffer_minutes, :max_appointments_per_day,
                      CAST(:visit_modes AS jsonb), :effective_from, :effective_to, true
                    )
                    """
                ),
                {
                    "doctor_id": doctor_id,
                    "day_of_week": int(day_of_week),
                    "start_time": str(start_time)[:5],
                    "end_time": str(end_time)[:5],
                    "slot_duration_minutes": int(rule.get("slotDurationMinutes", rule.get("slot_duration_minutes", 30))),
                    "buffer_minutes": int(rule.get("bufferMinutes", rule.get("buffer_minutes", 0))),
                    "max_appointments_per_day": rule.get("maxAppointmentsPerDay", rule.get("max_appointments_per_day")),
                    "visit_modes": json.dumps(visit_modes),
                    "effective_from": rule.get("effectiveFrom", rule.get("effective_from")) or today,
                    "effective_to": rule.get("effectiveTo", rule.get("effective_to")),
                },
            )

        from_date = today.isoformat()
        to_date = (today + timedelta(days=30)).isoformat()
        await self.generate_slots_for_doctor_range(doctor_id, from_date, to_date)
        return await self.get_availability(doctor_id)

    async def list_holidays(self, doctor_id: UUID) -> list[dict[str, Any]]:
        await self.assert_doctor_exists(doctor_id)
        result = await self.db.execute(
            text(
                """
                SELECT id, title, holiday_type, start_date, end_date, reason, created_at
                FROM operations.doctor_holidays
                WHERE doctor_id = :doctor_id
                ORDER BY start_date DESC
                """
            ),
            {"doctor_id": doctor_id},
        )
        return [self._map_holiday_row(dict(row)) for row in result.mappings().all()]

    async def create_holiday(
        self,
        doctor_id: UUID,
        actor_user_id: UUID,
        body: dict[str, Any],
    ) -> dict[str, Any]:
        await self.assert_doctor_exists(doctor_id)
        title = body.get("title")
        start_date = body.get("startDate", body.get("start_date"))
        end_date = body.get("endDate", body.get("end_date"))
        if not title or not start_date or not end_date:
            raise AppError("title, startDate, endDate are required", status_code=400)

        result = await self.db.execute(
            text(
                """
                INSERT INTO operations.doctor_holidays (
                  doctor_id, title, holiday_type, start_date, end_date, reason, created_by
                ) VALUES (
                  :doctor_id, :title, :holiday_type, :start_date, :end_date, :reason, :created_by
                )
                RETURNING id, title, holiday_type, start_date, end_date, reason, created_at
                """
            ),
            {
                "doctor_id": doctor_id,
                "title": title,
                "holiday_type": body.get("holidayType", body.get("holiday_type", "leave")),
                "start_date": start_date,
                "end_date": end_date,
                "reason": body.get("reason"),
                "created_by": actor_user_id,
            },
        )
        row = dict(result.mappings().one())
        await self._block_holiday_range(doctor_id, str(start_date), str(end_date), body.get("reason") or "leave")
        return self._map_holiday_row(row)

    async def get_availability_calendar(
        self,
        doctor_id: UUID,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> dict[str, Any]:
        await self.assert_doctor_exists(doctor_id)
        from_str = from_date or date.today().isoformat()
        if to_date:
            to_str = to_date
        else:
            to_str = (date.fromisoformat(from_str) + timedelta(days=13)).isoformat()

        await self.generate_slots_for_doctor_range(doctor_id, from_str, to_str)

        rules_result = await self.db.execute(
            text(
                """
                SELECT day_of_week, start_time, end_time, slot_duration_minutes, visit_modes, is_active
                FROM operations.doctor_availability
                WHERE doctor_id = :doctor_id AND is_active = true
                ORDER BY day_of_week, start_time
                """
            ),
            {"doctor_id": doctor_id},
        )
        days_result = await self.db.execute(
            text(
                """
                SELECT s.slot_date::text AS date,
                       COUNT(*)::int AS total_slots,
                       COUNT(*) FILTER (
                         WHERE s.is_blocked = false
                           AND s.status <> 'blocked'
                           AND s.current_bookings < s.max_bookings
                       )::int AS available_slots
                FROM operations.appointment_slots s
                WHERE s.doctor_id = :doctor_id
                  AND s.slot_date >= CAST(:from_date AS date)
                  AND s.slot_date <= CAST(:to_date AS date)
                GROUP BY s.slot_date
                ORDER BY s.slot_date ASC
                """
            ),
            {"doctor_id": doctor_id, "from_date": from_str, "to_date": to_str},
        )
        appointments_result = await self.db.execute(
            text(
                """
                SELECT a.id, a.appointment_code, a.scheduled_start, a.scheduled_end, a.status,
                       u.full_name AS patient_name, at.name AS type_name
                FROM operations.appointments a
                JOIN clinical.patients p ON p.id = a.patient_id
                JOIN identity.users u ON u.id = p.user_id
                JOIN operations.appointment_types at ON at.id = a.appointment_type_id
                WHERE a.doctor_id = :doctor_id
                  AND a.scheduled_start::date >= CAST(:from_date AS date)
                  AND a.scheduled_start::date <= CAST(:to_date AS date)
                  AND a.status::text = ANY(:statuses)
                ORDER BY a.scheduled_start ASC
                """
            ),
            {
                "doctor_id": doctor_id,
                "from_date": from_str,
                "to_date": to_str,
                "statuses": list(ACTIVE_APPOINTMENT_STATUSES),
            },
        )

        weekly_rules = []
        for row in rules_result.mappings().all():
            data = dict(row)
            visit_modes = data.get("visit_modes") or ["clinic", "tele"]
            if isinstance(visit_modes, str):
                visit_modes = json.loads(visit_modes)
            weekly_rules.append(
                {
                    "dayOfWeek": data["day_of_week"],
                    "startTime": str(data["start_time"])[:5],
                    "endTime": str(data["end_time"])[:5],
                    "slotDurationMinutes": data["slot_duration_minutes"],
                    "visitModes": visit_modes,
                }
            )

        slot_days = {row["date"]: dict(row) for row in days_result.mappings().all()}
        filled_days: list[dict[str, Any]] = []
        cursor = date.fromisoformat(from_str)
        end_date = date.fromisoformat(to_str)
        while cursor <= end_date:
            key = cursor.isoformat()
            row = slot_days.get(key)
            filled_days.append(
                {
                    "date": key,
                    "total_slots": int(row["total_slots"]) if row else 0,
                    "available_slots": int(row["available_slots"]) if row else 0,
                }
            )
            cursor += timedelta(days=1)

        return {
            "doctorId": doctor_id,
            "fromDate": from_str,
            "toDate": to_str,
            "weeklyRules": weekly_rules,
            "days": filled_days,
            "appointments": [
                {
                    "id": row["id"],
                    "appointmentCode": row["appointment_code"],
                    "scheduledStart": row["scheduled_start"],
                    "scheduledEnd": row["scheduled_end"],
                    "status": row["status"],
                    "patientName": row["patient_name"],
                    "typeName": row["type_name"],
                }
                for row in appointments_result.mappings().all()
            ],
        }

    async def list_doctor_slots(
        self,
        doctor_id: UUID,
        slot_date: str,
        visit_mode: str = "clinic",
        *,
        exclude_order_id: UUID | None = None,
    ) -> list[dict[str, Any]]:
        await self.assert_doctor_exists(doctor_id)
        if not slot_date:
            raise AppError("date is required", status_code=400)
        if date.fromisoformat(slot_date) < date.today():
            raise AppError("Cannot book in the past", status_code=400)

        await self.generate_slots_for_doctor_date(doctor_id, slot_date)
        slot_type = _slot_type_for_visit_mode(visit_mode)
        slot_day = _parse_slot_date(slot_date)
        slots_result = await self.db.execute(
            text(
                """
                SELECT s.*
                FROM operations.appointment_slots s
                WHERE s.doctor_id = :doctor_id
                  AND s.slot_date = :slot_date
                  AND s.slot_type = CAST(:slot_type AS operations.appointment_slot_type_enum)
                ORDER BY s.start_time ASC
                """
            ),
            {"doctor_id": doctor_id, "slot_date": slot_day, "slot_type": slot_type},
        )
        appointments_result = await self.db.execute(
            text(
                """
                SELECT scheduled_start, scheduled_end
                FROM operations.appointments
                WHERE doctor_id = :doctor_id
                  AND scheduled_start::date = :slot_date
                  AND status::text = ANY(:statuses)
                """
            ),
            {"doctor_id": doctor_id, "slot_date": slot_day, "statuses": list(ACTIVE_APPOINTMENT_STATUSES)},
        )
        appointments = appointments_result.mappings().all()
        consult_bookings = await self._load_doctor_consult_bookings(
            doctor_id, slot_date, exclude_order_id=exclude_order_id
        )
        now_ist = datetime.now(IST)

        slots: list[dict[str, Any]] = []
        for row in slots_result.mappings().all():
            slot = dict(row)
            start_time = str(slot["start_time"])[:8]
            end_time = str(slot["end_time"])[:8]
            scheduled_at = f"{slot_date}T{start_time[:5]}:00+05:30"
            slot_start = datetime.fromisoformat(f"{slot_date}T{start_time}").replace(tzinfo=IST)
            slot_end = datetime.fromisoformat(f"{slot_date}T{end_time}").replace(tzinfo=IST)

            booked = False
            for appt in appointments:
                appt_start = appt["scheduled_start"]
                appt_end = appt["scheduled_end"]
                if getattr(appt_start, "tzinfo", None) is None:
                    appt_start = appt_start.replace(tzinfo=IST)
                else:
                    appt_start = appt_start.astimezone(IST)
                if getattr(appt_end, "tzinfo", None) is None:
                    appt_end = appt_end.replace(tzinfo=IST)
                else:
                    appt_end = appt_end.astimezone(IST)
                if appt_start < slot_end and appt_end > slot_start:
                    booked = True
                    break

            if not booked:
                for consult_at in consult_bookings:
                    consult_start = consult_at
                    if getattr(consult_start, "tzinfo", None) is None:
                        consult_start = consult_start.replace(tzinfo=IST)
                    else:
                        consult_start = consult_start.astimezone(IST)
                    if consult_start < slot_end and consult_start >= slot_start:
                        booked = True
                        break

            blocked = bool(slot["is_blocked"]) or slot["status"] == "blocked"
            slot_full = int(slot["current_bookings"]) >= int(slot["max_bookings"])
            in_past = slot_start <= now_ist
            available = not in_past and not blocked and not booked and not slot_full

            slots.append(
                {
                    "id": slot["id"],
                    "code": str(slot["id"]),
                    "label": _format_slot_label(start_time, end_time),
                    "available": available,
                    "scheduledAt": scheduled_at if available else None,
                }
            )
        return slots

    async def _load_doctor_consult_bookings(
        self,
        doctor_id: UUID,
        slot_date: str,
        *,
        exclude_order_id: UUID | None = None,
    ) -> list[datetime]:
        params: dict[str, Any] = {"doctor_id": doctor_id, "slot_date": _parse_slot_date(slot_date)}
        exclude_sql = ""
        if exclude_order_id:
            exclude_sql = "AND o.id <> :exclude_order_id"
            params["exclude_order_id"] = exclude_order_id
        result = await self.db.execute(
            text(
                f"""
                SELECT o.consultation_scheduled_at
                FROM commerce.service_orders o
                WHERE o.doctor_id = :doctor_id
                  AND o.consultation_scheduled_at IS NOT NULL
                  AND o.consultation_scheduled_at::date = :slot_date
                  AND o.order_status NOT IN ('cancelled', 'completed')
                  AND o.deleted_at IS NULL
                  {exclude_sql}
                """
            ),
            params,
        )
        return [row["consultation_scheduled_at"] for row in result.mappings().all()]

    async def _list_active_doctor_ids(self) -> list[UUID]:
        result = await self.db.execute(
            text(
                """
                SELECT d.id
                FROM clinical.doctors d
                JOIN identity.users u ON u.id = d.user_id
                WHERE d.status IN ('active', 'draft')
                ORDER BY d.created_at ASC
                """
            )
        )
        return [row["id"] for row in result.mappings().all()]

    async def get_aggregate_tele_slots(
        self,
        slot_date: str,
        *,
        exclude_order_id: UUID | None = None,
        patient_preference: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        if not slot_date:
            raise AppError("date is required", status_code=400)
        if date.fromisoformat(slot_date) < date.today():
            raise AppError("Cannot book in the past", status_code=400)

        merged: dict[str, dict[str, Any]] = {}
        for doctor_id in await self._list_active_doctor_ids():
            for slot in await self.list_doctor_slots(
                doctor_id, slot_date, "tele", exclude_order_id=exclude_order_id
            ):
                key = slot.get("scheduledAt") or slot["code"]
                if not key:
                    continue
                existing = merged.get(key)
                if existing is None:
                    merged[key] = {
                        "code": key,
                        "label": slot["label"],
                        "available": bool(slot["available"]),
                        "scheduledAt": slot.get("scheduledAt"),
                    }
                elif slot["available"]:
                    existing["available"] = True

        pref_at = None
        pref_label = None
        if patient_preference:
            pref_at = patient_preference.get("consultationPatientPreferredAt") or patient_preference.get(
                "consultation_patient_preferred_at"
            )
            pref_label = patient_preference.get("consultationTimeSlot") or patient_preference.get(
                "consultation_time_slot"
            )

        rows = sorted(merged.values(), key=lambda row: row.get("scheduledAt") or row["code"])
        if pref_at and pref_label:
            pref_key = str(pref_at)
            for row in rows:
                if row.get("scheduledAt") and str(row["scheduledAt"]).startswith(pref_key[:16]):
                    row["isPatientPreference"] = True
                    break
            else:
                rows.insert(
                    0,
                    {
                        "code": pref_key,
                        "label": pref_label,
                        "available": True,
                        "scheduledAt": pref_at,
                        "isPatientPreference": True,
                    },
                )
        return rows

    async def is_doctor_available_for_consult_slot(
        self,
        doctor_id: UUID,
        scheduled_at: datetime,
        *,
        exclude_order_id: UUID | None = None,
    ) -> bool:
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=UTC)
        slot_date = scheduled_at.astimezone(IST).date().isoformat()
        target = scheduled_at.astimezone(IST).replace(second=0, microsecond=0)
        for slot in await self.list_doctor_slots(
            doctor_id, slot_date, "tele", exclude_order_id=exclude_order_id
        ):
            if not slot.get("available") or not slot.get("scheduledAt"):
                continue
            slot_start = datetime.fromisoformat(str(slot["scheduledAt"]).replace("Z", "+00:00")).astimezone(IST)
            slot_start = slot_start.replace(second=0, microsecond=0)
            if slot_start == target:
                return True
        return False

    async def list_doctors_available_for_slot(
        self,
        scheduled_at: datetime,
        *,
        language: str | None = None,
        exclude_order_id: UUID | None = None,
    ) -> list[dict[str, Any]]:
        from app.services.ops_analytics_service import OpsAnalyticsService

        doctors = await OpsAnalyticsService(self.db).list_doctors(language=language)
        available: list[dict[str, Any]] = []
        for doctor in doctors:
            doctor_id = doctor["id"]
            if await self.is_doctor_available_for_consult_slot(
                doctor_id, scheduled_at, exclude_order_id=exclude_order_id
            ):
                available.append(
                    {
                        "id": doctor_id,
                        "name": doctor["fullName"],
                        "languages": doctor.get("languagesKnown") or [],
                        "specialty": doctor.get("specialization"),
                    }
                )
        return available

    async def generate_slots_for_doctor_range(self, doctor_id: UUID, from_date: str, to_date: str) -> int:
        current = date.fromisoformat(from_date)
        end = date.fromisoformat(to_date)
        total = 0
        while current <= end:
            total += await self.generate_slots_for_doctor_date(doctor_id, current.isoformat())
            current += timedelta(days=1)
        return total

    async def generate_slots_for_doctor_date(self, doctor_id: UUID, slot_date: str) -> int:
        if await self._is_doctor_on_holiday(doctor_id, slot_date):
            return 0

        slot_day = _parse_slot_date(slot_date)
        day_of_week = _day_of_week_for_date(slot_date)
        rules_result = await self.db.execute(
            text(
                """
                SELECT *
                FROM operations.doctor_availability
                WHERE doctor_id = :doctor_id
                  AND day_of_week = :day_of_week
                  AND is_active = true
                  AND effective_from <= :slot_date
                  AND (effective_to IS NULL OR effective_to >= :slot_date)
                """
            ),
            {"doctor_id": doctor_id, "day_of_week": day_of_week, "slot_date": slot_day},
        )
        rules = rules_result.mappings().all()
        if not rules:
            return 0

        created = 0
        for rule in rules:
            data = dict(rule)
            duration = int(data["slot_duration_minutes"]) + int(data["buffer_minutes"])
            cursor = parse_time_to_minutes(str(data["start_time"]))
            end_minutes = parse_time_to_minutes(str(data["end_time"]))
            visit_modes = data.get("visit_modes") or ["clinic", "tele"]
            if isinstance(visit_modes, str):
                visit_modes = json.loads(visit_modes)

            while cursor + int(data["slot_duration_minutes"]) <= end_minutes:
                start_time = minutes_to_time(cursor)
                end_time = minutes_to_time(cursor + int(data["slot_duration_minutes"]))
                for mode in visit_modes:
                    slot_type = _slot_type_for_visit_mode(str(mode))
                    inserted = await self.db.execute(
                        text(
                            """
                            INSERT INTO operations.appointment_slots (
                              doctor_id, slot_date, start_time, end_time, slot_type, status, max_bookings
                            ) VALUES (
                              :doctor_id, :slot_date, :start_time, :end_time,
                              CAST(:slot_type AS operations.appointment_slot_type_enum), 'open', 1
                            )
                            ON CONFLICT (doctor_id, slot_date, start_time, slot_type)
                            WHERE doctor_id IS NOT NULL AND is_blocked = false
                            DO NOTHING
                            RETURNING id
                            """
                        ),
                        {
                            "doctor_id": doctor_id,
                            "slot_date": slot_day,
                            "start_time": start_time,
                            "end_time": end_time,
                            "slot_type": slot_type,
                        },
                    )
                    if inserted.scalar_one_or_none():
                        created += 1
                cursor += duration
        return created

    async def _is_doctor_on_holiday(self, doctor_id: UUID, slot_date: str) -> bool:
        slot_day = date.fromisoformat(slot_date)
        result = await self.db.execute(
            text(
                """
                SELECT 1 FROM operations.doctor_holidays
                WHERE doctor_id = :doctor_id
                  AND :slot_date BETWEEN start_date AND end_date
                LIMIT 1
                """
            ),
            {"doctor_id": doctor_id, "slot_date": slot_day},
        )
        return result.scalar_one_or_none() is not None

    async def _block_holiday_range(
        self,
        doctor_id: UUID,
        start_date: str,
        end_date: str,
        reason: str,
    ) -> None:
        await self.db.execute(
            text(
                """
                UPDATE operations.appointment_slots
                SET is_blocked = true, block_reason = :reason, status = 'blocked', updated_at = now()
                WHERE doctor_id = :doctor_id
                  AND slot_date >= CAST(:start_date AS date)
                  AND slot_date <= CAST(:end_date AS date)
                """
            ),
            {"doctor_id": doctor_id, "start_date": start_date, "end_date": end_date, "reason": reason},
        )

    @staticmethod
    def _map_rule_row(row: dict[str, Any]) -> dict[str, Any]:
        visit_modes = row.get("visit_modes") or ["clinic", "tele"]
        if isinstance(visit_modes, str):
            visit_modes = json.loads(visit_modes)
        return {
            "id": row["id"],
            "dayOfWeek": row["day_of_week"],
            "startTime": str(row["start_time"])[:5],
            "endTime": str(row["end_time"])[:5],
            "slotDurationMinutes": row["slot_duration_minutes"],
            "bufferMinutes": row["buffer_minutes"],
            "maxAppointmentsPerDay": row.get("max_appointments_per_day"),
            "visitModes": visit_modes,
            "effectiveFrom": row.get("effective_from"),
            "effectiveTo": row.get("effective_to"),
            "isActive": row.get("is_active", True),
        }

    @staticmethod
    def _map_exception_row(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "exceptionDate": row["exception_date"],
            "isBlocked": row["is_blocked"],
            "startTime": str(row["start_time"])[:5] if row.get("start_time") else None,
            "endTime": str(row["end_time"])[:5] if row.get("end_time") else None,
            "reason": row.get("reason"),
        }

    @staticmethod
    def _map_holiday_row(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "title": row["title"],
            "holiday_type": row["holiday_type"],
            "start_date": row["start_date"],
            "end_date": row["end_date"],
            "reason": row.get("reason"),
            "created_at": row["created_at"],
        }
