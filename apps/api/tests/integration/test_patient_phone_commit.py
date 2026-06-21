"""Patient phone commit and duplicate-phone guard integration tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import (
    DEMO_OTP,
    auth_headers,
    assign_first_technician,
    create_order,
    login,
    pay_offline,
    schedule_scan,
    unique_phone,
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


def _intake_payload(name: str, phone: str) -> dict:
    return {
        "name": name,
        "sex": "female",
        "age": 45,
        "phone": phone,
        "comorbidities": {"bloodPressure": False, "sugar": False, "thyroid": False},
    }


def _prepare_field_visit(client: TestClient, admin_token: str, tech_token: str, order_id: str) -> dict[str, str]:
    assign_first_technician(client, admin_token, order_id)
    schedule_scan(client, admin_token, order_id)
    headers = auth_headers(tech_token)
    client.post(f"/api/v1/technician/orders/{order_id}/visit-started", headers=headers)
    client.post(f"/api/v1/technician/orders/{order_id}/reached", headers=headers)
    return headers


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


def test_technician_verify_commits_corrected_phone(
    client: TestClient, admin_token: str, tech_token: str
) -> None:
    order, booking_phone = create_order(
        client, admin_token, package_code="PKG-1", patient_name="Phone Commit Patient"
    )
    order_id = order["id"]
    original_patient_id = order["patientId"]
    corrected_phone = unique_phone()

    pay_offline(client, admin_token, order)
    headers = _prepare_field_visit(client, admin_token, tech_token, order_id)

    send = client.post(
        f"/api/v1/technician/orders/{order_id}/patient-intake/otp",
        headers=headers,
        json={"phone": corrected_phone},
    )
    assert send.status_code == 200, send.text

    verify = client.post(
        f"/api/v1/technician/orders/{order_id}/patient-intake/verify",
        headers=headers,
        json={**_intake_payload("Phone Commit Patient", corrected_phone), "otp": DEMO_OTP},
    )
    assert verify.status_code == 200, verify.text
    body = verify.json()["data"]
    assert body["phoneOtpVerified"] is True
    assert body["verifiedPhone"] == corrected_phone

    refreshed = client.get(f"/api/v1/admin/orders/{order_id}", headers=auth_headers(admin_token))
    assert refreshed.status_code == 200, refreshed.text
    order_row = refreshed.json()["data"]
    assert order_row["patientPhone"] == corrected_phone
    assert order_row["patientId"] != original_patient_id

    assert "patient_intake_verified" in _trigger_events(client, admin_token, order_id)
    assert booking_phone != corrected_phone


def test_technician_verify_rejects_phone_in_use(
    client: TestClient, admin_token: str, tech_token: str
) -> None:
    order_a, phone_a = create_order(client, admin_token, package_code="PKG-1", patient_name="Patient A")
    order_b, _phone_b = create_order(client, admin_token, package_code="PKG-1", patient_name="Patient B")
    order_b_id = order_b["id"]

    pay_offline(client, admin_token, order_a)
    pay_offline(client, admin_token, order_b)
    headers = _prepare_field_visit(client, admin_token, tech_token, order_b_id)

    client.post(
        f"/api/v1/technician/orders/{order_b_id}/patient-intake/otp",
        headers=headers,
        json={"phone": phone_a},
    )
    verify = client.post(
        f"/api/v1/technician/orders/{order_b_id}/patient-intake/verify",
        headers=headers,
        json={**_intake_payload("Patient B", phone_a), "otp": DEMO_OTP},
    )
    assert verify.status_code == 409, verify.text
    assert verify.json()["error"] == "phone_in_use"


def test_operator_verify_commits_phone(
    client: TestClient, admin_token: str, tech_token: str
) -> None:
    order, booking_phone = create_order(
        client, admin_token, package_code="PKG-1", patient_name="Operator Phone Patient"
    )
    order_id = order["id"]
    new_phone = unique_phone()
    admin_headers = auth_headers(admin_token)

    pay_offline(client, admin_token, order)

    send = client.post(
        f"/api/v1/admin/orders/{order_id}/patient-intake/otp",
        headers=admin_headers,
        json={"phone": new_phone},
    )
    assert send.status_code == 200, send.text

    verify = client.post(
        f"/api/v1/admin/orders/{order_id}/patient-intake/verify",
        headers=admin_headers,
        json={**_intake_payload("Operator Phone Patient", new_phone), "otp": DEMO_OTP},
    )
    assert verify.status_code == 200, verify.text
    assert verify.json()["data"]["verifiedPhone"] == new_phone

    refreshed = client.get(f"/api/v1/admin/orders/{order_id}", headers=admin_headers)
    assert refreshed.json()["data"]["patientPhone"] == new_phone
    assert booking_phone != new_phone
    assert "patient_intake_verified" in _trigger_events(client, admin_token, order_id)

    # Technician should see verified phone at visit without re-committing booking phone
    headers = _prepare_field_visit(client, admin_token, tech_token, order_id)
    intake = client.get(f"/api/v1/technician/orders/{order_id}/patient-intake", headers=headers)
    assert intake.json()["data"]["phone"] == new_phone
