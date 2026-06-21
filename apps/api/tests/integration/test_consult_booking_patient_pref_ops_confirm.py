"""Patient preferred consult slot → ops confirm with doctor."""

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
    patient_request_consult_slot,
    pay_offline,
    schedule_scan,
    assign_first_technician,
    technician_complete_scan,
)


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return login(client, "admin@livotale.com", "Admin@123")


@pytest.fixture
def tech_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "technician@livotale.com", "password": "Tech@123"},
    )
    if response.status_code != 200:
        pytest.skip("technician@livotale.com not available in test database")
    return response.json()["data"]["accessToken"]


def _advance_pkg3_to_consult(
    client: TestClient,
    admin_token: str,
    tech_token: str,
) -> tuple[dict, str, str]:
    order, phone = create_order(client, admin_token, package_code="PKG-3", patient_name="Consult Pref Patient")
    order_id = order["id"]
    pay_offline(client, admin_token, order)
    assign_first_technician(client, admin_token, order_id)
    schedule_scan(client, admin_token, order_id)
    technician_complete_scan(
        client,
        tech_token,
        order_id,
        admin_token=admin_token,
        patient_phone=phone,
        patient_name="Consult Pref Patient",
    )
    assign_lab_and_upload_report(client, admin_token, order_id)
    generate_and_publish_report(client, admin_token, order_id)
    return order, phone, order_id


def test_patient_pref_then_ops_confirm_consult(
    client: TestClient,
    admin_token: str,
    tech_token: str,
) -> None:
    _, phone, order_id = _advance_pkg3_to_consult(client, admin_token, tech_token)

    patient_request_consult_slot(client, phone, order_id, admin_token)
    confirmed = confirm_consult_with_doctor(client, admin_token, order_id)

    assert confirmed["orderStatus"] == "consultation_pending"
    assert confirmed["doctorId"]
    assert confirmed["consultationScheduledAt"]

    timeline = client.get(
        f"/api/v1/admin/orders/{order_id}/timeline",
        headers=auth_headers(admin_token),
    )
    assert timeline.status_code == 200
    event_types = [row["eventType"] for row in timeline.json()["data"]]
    assert "consultation_date_requested" in event_types
    assert "consultation_schedule_confirmed" in event_types


def test_public_consult_slots_endpoint(client: TestClient) -> None:
    from datetime import UTC, datetime, timedelta

    consult_date = (datetime.now(UTC) + timedelta(days=1)).date().isoformat()
    response = client.get("/api/v1/public/slots/consult", params={"date": consult_date})
    assert response.status_code == 200
    rows = response.json()["data"]
    assert isinstance(rows, list)
