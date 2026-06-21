"""Doctor cannot schedule consultation time."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import (
    assign_lab_and_upload_report,
    auth_headers,
    confirm_consult_with_doctor,
    create_order,
    generate_and_publish_report,
    login,
    pay_offline,
    schedule_scan,
    assign_first_technician,
    technician_complete_scan,
)


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return login(client, "admin@livotale.com", "Admin@123")


@pytest.fixture
def doctor_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "doctor@livotale.com", "password": "Doctor@123"},
    )
    if response.status_code != 200:
        pytest.skip("doctor@livotale.com not available in test database")
    return response.json()["data"]["accessToken"]


@pytest.fixture
def tech_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "technician@livotale.com", "password": "Tech@123"},
    )
    if response.status_code != 200:
        pytest.skip("technician@livotale.com not available in test database")
    return response.json()["data"]["accessToken"]


def test_doctor_cannot_schedule_consultation(
    client: TestClient,
    admin_token: str,
    doctor_token: str,
    tech_token: str,
) -> None:
    order, phone = create_order(client, admin_token, package_code="PKG-3")
    order_id = order["id"]
    pay_offline(client, admin_token, order)
    assign_first_technician(client, admin_token, order_id)
    schedule_scan(client, admin_token, order_id)
    technician_complete_scan(client, tech_token, order_id, admin_token=admin_token, patient_phone=phone)
    assign_lab_and_upload_report(client, admin_token, order_id)
    generate_and_publish_report(client, admin_token, order_id)
    confirm_consult_with_doctor(client, admin_token, order_id)

    from datetime import UTC, datetime, timedelta

    scheduled_at = (datetime.now(UTC) + timedelta(days=4)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    response = client.post(
        f"/api/v1/doctor/consultations/{order_id}/schedule",
        headers=auth_headers(doctor_token),
        json={"scheduledAt": scheduled_at, "type": "video"},
    )
    assert response.status_code == 403, response.text
    assert response.json()["error"]["code"] == "doctor_cannot_schedule"
