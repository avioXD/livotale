"""Consult scheduling notification triggers."""

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
    sample_rx_payload,
    schedule_scan,
    setup_pkg3_prescription_ready,
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


def test_consult_date_requested_notification(client: TestClient, admin_token: str, tech_token: str) -> None:
    order, phone = create_order(client, admin_token, package_code="PKG-3")
    order_id = order["id"]
    pay_offline(client, admin_token, order)
    assign_first_technician(client, admin_token, order_id)
    schedule_scan(client, admin_token, order_id)
    technician_complete_scan(client, tech_token, order_id, admin_token=admin_token, patient_phone=phone)
    assign_lab_and_upload_report(client, admin_token, order_id)
    generate_and_publish_report(client, admin_token, order_id)

    patient_request_consult_slot(client, phone, order_id, admin_token)

    logs = client.get("/api/v1/admin/notifications/log", headers=auth_headers(admin_token))
    assert logs.status_code == 200, logs.text
    triggers = {row.get("triggerAction") for row in logs.json()["data"]}
    assert "consultation_date_requested" in triggers


def test_consult_schedule_confirmed_notification(client: TestClient, admin_token: str, tech_token: str) -> None:
    order, phone = create_order(client, admin_token, package_code="PKG-3")
    order_id = order["id"]
    pay_offline(client, admin_token, order)
    assign_first_technician(client, admin_token, order_id)
    schedule_scan(client, admin_token, order_id)
    technician_complete_scan(client, tech_token, order_id, admin_token=admin_token, patient_phone=phone)
    assign_lab_and_upload_report(client, admin_token, order_id)
    generate_and_publish_report(client, admin_token, order_id)

    confirm_consult_with_doctor(client, admin_token, order_id)

    logs = client.get("/api/v1/admin/notifications/log", headers=auth_headers(admin_token))
    assert logs.status_code == 200, logs.text
    triggers = {row.get("triggerAction") for row in logs.json()["data"]}
    assert "consultation_schedule_confirmed" in triggers or "consultation_scheduled" in triggers


@pytest.fixture
def doctor_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "doctor@livotale.com", "password": "Doctor@123"},
    )
    if response.status_code != 200:
        pytest.skip("doctor@livotale.com not available in test database")
    return response.json()["data"]["accessToken"]


def _order_triggers(client: TestClient, admin_token: str, order_id: str) -> set[str]:
    logs = client.get(
        "/api/v1/admin/notifications/log",
        headers=auth_headers(admin_token),
        params={"orderId": order_id, "limit": 500},
    )
    assert logs.status_code == 200, logs.text
    return {
        row.get("triggerEvent") or row.get("triggerAction")
        for row in logs.json()["data"]
        if str(row.get("orderId")) == order_id
    }


def test_consultation_completed_notification(
    client: TestClient, admin_token: str, tech_token: str, doctor_token: str
) -> None:
    order_id, _phone, _visit_log_id = setup_pkg3_prescription_ready(
        client, admin_token, tech_token, doctor_token
    )
    triggers = _order_triggers(client, admin_token, order_id)
    assert "consultation_completed" in triggers


def test_prescription_published_notification(
    client: TestClient, admin_token: str, tech_token: str, doctor_token: str
) -> None:
    order_id, _phone, visit_log_id = setup_pkg3_prescription_ready(
        client, admin_token, tech_token, doctor_token
    )
    doctor_headers = auth_headers(doctor_token)

    draft = client.put(
        f"/api/v1/doctor/orders/{order_id}/org/prescriptions/{visit_log_id}",
        headers=doctor_headers,
        json=sample_rx_payload(),
    )
    assert draft.status_code == 200, draft.text

    published = client.post(
        f"/api/v1/doctor/orders/{order_id}/org/prescriptions/{visit_log_id}/publish",
        headers=doctor_headers,
    )
    assert published.status_code == 200, published.text

    triggers = _order_triggers(client, admin_token, order_id)
    assert "prescription_published" in triggers
