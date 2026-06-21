from __future__ import annotations

from datetime import date, datetime, time
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema


class DoctorAvailabilityRule(BaseSchema):
    id: UUID | None = None
    day_of_week: int = Field(alias="dayOfWeek")
    start_time: str = Field(alias="startTime")
    end_time: str = Field(alias="endTime")
    slot_duration_minutes: int = Field(default=30, alias="slotDurationMinutes")
    buffer_minutes: int = Field(default=0, alias="bufferMinutes")
    max_appointments_per_day: int | None = Field(default=None, alias="maxAppointmentsPerDay")
    visit_modes: list[str] = Field(default_factory=lambda: ["clinic", "tele"], alias="visitModes")
    effective_from: date | None = Field(default=None, alias="effectiveFrom")
    effective_to: date | None = Field(default=None, alias="effectiveTo")
    is_active: bool = Field(default=True, alias="isActive")


class DoctorAvailabilityException(BaseSchema):
    id: UUID
    exception_date: date = Field(alias="exceptionDate")
    is_blocked: bool = Field(alias="isBlocked")
    start_time: time | None = Field(default=None, alias="startTime")
    end_time: time | None = Field(default=None, alias="endTime")
    reason: str | None = None


class DoctorAvailabilityPayload(BaseSchema):
    rules: list[DoctorAvailabilityRule]


class DoctorAvailabilityResponse(BaseSchema):
    rules: list[DoctorAvailabilityRule]
    exceptions: list[DoctorAvailabilityException] = Field(default_factory=list)


class DoctorHolidayCreate(BaseSchema):
    title: str
    start_date: date = Field(alias="startDate")
    end_date: date = Field(alias="endDate")
    holiday_type: str = Field(default="leave", alias="holidayType")
    reason: str | None = None


class DoctorHoliday(BaseSchema):
    id: UUID
    title: str
    holiday_type: str
    start_date: date
    end_date: date
    reason: str | None = None
    created_at: datetime


class DoctorAvailabilityCalendarDay(BaseSchema):
    date: str
    total_slots: int
    available_slots: int


class DoctorAvailabilityCalendarAppointment(BaseSchema):
    id: UUID
    appointment_code: str = Field(alias="appointmentCode")
    scheduled_start: datetime = Field(alias="scheduledStart")
    scheduled_end: datetime = Field(alias="scheduledEnd")
    status: str
    patient_name: str = Field(alias="patientName")
    type_name: str = Field(alias="typeName")


class DoctorAvailabilityCalendar(BaseSchema):
    doctor_id: UUID = Field(alias="doctorId")
    from_date: date = Field(alias="fromDate")
    to_date: date = Field(alias="toDate")
    weekly_rules: list[DoctorAvailabilityRule] = Field(alias="weeklyRules")
    days: list[DoctorAvailabilityCalendarDay]
    appointments: list[DoctorAvailabilityCalendarAppointment] = Field(default_factory=list)


class DoctorTimeSlot(BaseSchema):
    id: UUID | None = None
    code: str
    label: str
    available: bool
    scheduled_at: str | None = Field(default=None, alias="scheduledAt")
