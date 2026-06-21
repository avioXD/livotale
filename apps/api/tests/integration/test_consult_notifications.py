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
