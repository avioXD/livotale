"""Contract tests for consult scheduling endpoints."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import auth_headers, create_order, login, pay_offline


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return login(client, "admin@livotale.com", "Admin@123")


def test_consult_endpoints_require_auth(client: TestClient) -> None:
    consult_date = (datetime.now(UTC) + timedelta(days=2)).date().isoformat()
    assert client.get("/api/v1/public/slots/consult", params={"date": consult_date}).status_code == 200
    assert client.get("/api/v1/admin/doctors/available-for-slot", params={"scheduledAt": "2099-01-01T10:00:00Z"}).status_code in {
        401,
        403,
    }


def test_available_for_slot_validation(client: TestClient, admin_token: str) -> None:
    response = client.get(
        "/api/v1/admin/doctors/available-for-slot",
        headers=auth_headers(admin_token),
        params={"scheduledAt": (datetime.now(UTC) + timedelta(days=3)).isoformat()},
    )
    assert response.status_code == 200, response.text
    assert isinstance(response.json()["data"], list)


def test_confirm_consult_requires_doctor(client: TestClient, admin_token: str) -> None:
    order, _ = create_order(client, admin_token, package_code="PKG-3")
    pay_offline(client, admin_token, order)
    scheduled = (datetime.now(UTC) + timedelta(days=5)).isoformat()
    response = client.post(
        f"/api/v1/admin/orders/{order['id']}/confirm-consultation-schedule",
        headers=auth_headers(admin_token),
        json={
            "scheduledAt": scheduled,
            "timeSlot": "10:00 AM",
            "doctorId": "00000000-0000-0000-0000-000000000099",
            "doctorName": "Missing Doctor",
        },
    )
    assert response.status_code in {400, 409}, response.text
