from __future__ import annotations

from collections.abc import Iterator
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


def _future_on_weekday(weekday: int, *, days_ahead: int = 14) -> date:
    """Return a future date matching Python weekday (Mon=0). API dayOfWeek uses Sun=0."""
    target = date.today() + timedelta(days=days_ahead)
    while target.weekday() != weekday:
        target += timedelta(days=1)
    return target


@pytest.fixture(scope="module")
def staff_client() -> Iterator[TestClient]:
    with TestClient(create_app()) as test_client:
        yield test_client


def _login(client: TestClient, identifier: str, password: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": identifier, "password": password},
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]["accessToken"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def admin_token(staff_client: TestClient) -> str:
    return _login(staff_client, "admin@livotale.com", "Admin@123")


@pytest.fixture(scope="module")
def ops_token(staff_client: TestClient) -> str:
    return _login(staff_client, "operations@livotale.com", "Ops@123")


def _seed_doctor(client: TestClient, admin_token: str) -> str:
    headers = _auth_headers(admin_token)
    mobile = f"+9195{int(__import__('time').time()) % 100000000:08d}"
    email = f"schedule.doctor.{int(__import__('time').time())}@livotale.test"
    create = client.post(
        "/api/v1/admin/staff/doctors/onboard",
        headers=headers,
        json={"fullName": "Schedule Test Doctor", "mobile": mobile, "email": email},
    )
    assert create.status_code == 200, create.text
    return create.json()["data"]["memberId"]


def test_admin_can_save_doctor_weekly_schedule(staff_client: TestClient, admin_token: str):
    doctor_id = _seed_doctor(staff_client, admin_token)
    headers = _auth_headers(admin_token)

    empty = staff_client.get(f"/api/v1/admin/doctors/{doctor_id}/schedule", headers=headers)
    assert empty.status_code == 200, empty.text
    assert empty.json()["data"]["rules"] == []

    save = staff_client.put(
        f"/api/v1/admin/doctors/{doctor_id}/schedule",
        headers=headers,
        json={
            "rules": [
                {
                    "dayOfWeek": 1,
                    "startTime": "10:00",
                    "endTime": "13:00",
                    "slotDurationMinutes": 30,
                    "visitModes": ["clinic", "tele"],
                },
                {
                    "dayOfWeek": 3,
                    "startTime": "14:00",
                    "endTime": "17:00",
                    "slotDurationMinutes": 30,
                    "visitModes": ["tele"],
                },
            ],
        },
    )
    assert save.status_code == 200, save.text
    saved = save.json()["data"]
    assert len(saved["rules"]) == 2
    assert saved["rules"][0]["dayOfWeek"] == 1
    assert saved["rules"][0]["startTime"] == "10:00"

    window_start = _future_on_weekday(0)
    window_end = window_start + timedelta(days=13)
    slot_day = _future_on_weekday(0, days_ahead=15)

    calendar = staff_client.get(
        f"/api/v1/admin/doctors/{doctor_id}/availability",
        headers=headers,
        params={"fromDate": window_start.isoformat(), "toDate": window_end.isoformat()},
    )
    assert calendar.status_code == 200, calendar.text
    assert len(calendar.json()["data"]["weeklyRules"]) == 2
    first_day = calendar.json()["data"]["days"][0]
    assert "total_slots" in first_day
    assert "available_slots" in first_day
    assert "totalSlots" not in first_day

    slots = staff_client.get(
        f"/api/v1/admin/doctors/{doctor_id}/slots",
        headers=headers,
        params={"date": slot_day.isoformat(), "visitMode": "tele"},
    )
    assert slots.status_code == 200, slots.text
    slot_rows = slots.json()["data"]
    assert isinstance(slot_rows, list)
    if slot_rows:
        assert "scheduledAt" in slot_rows[0]
        assert "available" in slot_rows[0]


def test_operations_can_manage_doctor_schedule_and_leave(staff_client: TestClient, ops_token: str, admin_token: str):
    doctor_id = _seed_doctor(staff_client, admin_token)
    headers = _auth_headers(ops_token)

    save = staff_client.put(
        f"/api/v1/admin/doctors/{doctor_id}/schedule",
        headers=headers,
        json={
            "rules": [
                {
                    "dayOfWeek": 2,
                    "startTime": "09:00",
                    "endTime": "12:00",
                    "slotDurationMinutes": 30,
                    "visitModes": ["clinic"],
                },
            ],
        },
    )
    assert save.status_code == 200, save.text

    leave_start = date.today() + timedelta(days=60)
    leave_end = leave_start + timedelta(days=2)

    holiday = staff_client.post(
        f"/api/v1/admin/doctors/{doctor_id}/holidays",
        headers=headers,
        json={
            "title": "Conference leave",
            "startDate": leave_start.isoformat(),
            "endDate": leave_end.isoformat(),
            "reason": "Medical conference",
        },
    )
    assert holiday.status_code == 200, holiday.text
    body = holiday.json()["data"]
    assert body["title"] == "Conference leave"
    assert body["start_date"] == leave_start.isoformat()

    listed = staff_client.get(f"/api/v1/admin/doctors/{doctor_id}/holidays", headers=headers)
    assert listed.status_code == 200, listed.text
    assert any(row["title"] == "Conference leave" for row in listed.json()["data"])


def test_doctor_self_service_availability(staff_client: TestClient):
    token = _login(staff_client, "doctor@livotale.com", "Doctor@123")
    headers = _auth_headers(token)

    current = staff_client.get("/api/v1/doctor/availability", headers=headers)
    assert current.status_code == 200, current.text

    save = staff_client.put(
        "/api/v1/doctor/availability",
        headers=headers,
        json={
            "rules": [
                {
                    "dayOfWeek": 4,
                    "startTime": "11:00",
                    "endTime": "15:00",
                    "slotDurationMinutes": 30,
                    "visitModes": ["clinic", "tele"],
                },
            ],
        },
    )
    assert save.status_code == 200, save.text
    assert save.json()["data"]["rules"][0]["dayOfWeek"] == 4
