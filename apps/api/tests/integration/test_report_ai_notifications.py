"""AI extraction and final report notification integration tests (N9–N12)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import (
    assign_lab_and_upload_report,
    auth_headers,
    create_order,
    generate_and_publish_report,
    login,
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


def test_ai_and_report_notifications(client: TestClient, admin_token: str, tech_token: str) -> None:
    order, phone = create_order(client, admin_token, package_code="PKG-3")
    order_id = order["id"]
    pay_offline(client, admin_token, order)
    schedule_scan(client, admin_token, order_id)
    technician_complete_scan(
        client,
        tech_token,
        order_id,
        admin_token=admin_token,
        patient_phone=phone,
    )
    assign_lab_and_upload_report(client, admin_token, order_id)
    generate_and_publish_report(client, admin_token, order_id)

    triggers = _trigger_events(client, admin_token, order_id)
    assert "ai_extraction_ready" in triggers
    assert "ai_verified" in triggers
    assert "final_report_generated" in triggers
    assert "final_report_published" in triggers
