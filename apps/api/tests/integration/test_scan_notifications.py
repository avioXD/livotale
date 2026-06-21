"""Scan booking and visit workflow notification integration tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import (
    DEMO_OTP,
    auth_headers,
    confirm_scan_with_technician,
    create_order,
    login,
    patient_request_scan_slot,
    pay_offline,
    schedule_scan,
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


def _trigger_events(client: TestClient, admin_token: str, order_id: str) -> set[str]:
    response = client.get(
        "/api/v1/admin/notifications/log",
        headers=auth_headers(admin_token),
        params={"orderId": order_id, "limit": 500},
    )
    assert response.status_code == 200, response.text
    return {
        row["triggerEvent"]
        for row in response.json()["data"]
        if row.get("triggerEvent") and str(row.get("orderId")) == order_id
    }


def test_scan_date_requested_notification(client: TestClient, admin_token: str) -> None:
    order, phone = create_order(client, admin_token, package_code="PKG-1")
    order_id = order["id"]
    pay_offline(client, admin_token, order)

    patient_request_scan_slot(client, phone, order_id, admin_token)

    triggers = _trigger_events(client, admin_token, order_id)
    assert "scan_date_requested" in triggers


def test_scan_schedule_confirmed_notifications(
    client: TestClient, admin_token: str, tech_token: str
) -> None:
    order, phone = create_order(client, admin_token, package_code="PKG-1")
    order_id = order["id"]
    pay_offline(client, admin_token, order)
    patient_request_scan_slot(client, phone, order_id, admin_token)
    confirm_scan_with_technician(client, admin_token, order_id)

    triggers = _trigger_events(client, admin_token, order_id)
    assert "scan_schedule_confirmed" in triggers
    assert "technician_visit_assigned" in triggers

    tech_inbox = client.get(
        "/api/v1/notifications/inbox",
        headers=auth_headers(tech_token),
        params={"role": "TECHNICIAN"},
    )
    assert tech_inbox.status_code == 200, tech_inbox.text
    tech_actions = [row.get("triggerAction") for row in tech_inbox.json()["data"]]
    assert "technician_visit_assigned" in tech_actions


def test_visit_notifications_through_complete(
    client: TestClient, admin_token: str, tech_token: str
) -> None:
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Notify Visit")
    order_id = order["id"]
    pay_offline(client, admin_token, order)
    schedule_scan(client, admin_token, order_id)

    technician_complete_scan(
        client,
        tech_token,
        order_id,
        patient_phone=phone,
        patient_name="Notify Visit",
    )

    triggers = _trigger_events(client, admin_token, order_id)
    assert "visit_started" in triggers
    assert "visit_reached" in triggers
    assert "scan_completed" in triggers


def test_technician_intake_without_ops_prefill(client: TestClient, admin_token: str, tech_token: str) -> None:
    """Technician can complete intake at location without ops pre-fill."""
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="No Ops Prefill")
    order_id = order["id"]
    headers = auth_headers(tech_token)

    pay_offline(client, admin_token, order)
    schedule_scan(client, admin_token, order_id)

    intake_before = client.get(
        f"/api/v1/technician/orders/{order_id}/patient-intake",
        headers=headers,
    )
    assert intake_before.status_code == 200
    assert intake_before.json()["data"] is None

    client.post(f"/api/v1/technician/orders/{order_id}/visit-started", headers=headers)
    client.post(f"/api/v1/technician/orders/{order_id}/reached", headers=headers)
    client.post(f"/api/v1/technician/orders/{order_id}/patient-intake/otp", headers=headers)
    verify = client.post(
        f"/api/v1/technician/orders/{order_id}/patient-intake/verify",
        headers=headers,
        json={
            "name": "No Ops Prefill",
            "sex": "female",
            "age": 45,
            "phone": phone,
            "comorbidities": {"bloodPressure": False, "sugar": False, "thyroid": False},
            "otp": DEMO_OTP,
        },
    )
    assert verify.status_code == 200, verify.text
    body = verify.json()["data"]
    assert body["operatorVerificationStatus"] == "approved"
    assert body["technicianVerifiedAt"]
    assert body["phoneOtpVerified"] is True
