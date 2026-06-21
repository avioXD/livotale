"""PKG-2 pathology pipeline integration test."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import (
    assign_lab_and_upload_report,
    auth_headers,
    complete_order,
    create_order,
    generate_and_publish_report,
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


def test_pkg2_pathology_pipeline(client: TestClient, admin_token: str, tech_token: str):
    order, phone = create_order(client, admin_token, package_code="PKG-2", patient_name="PKG2 Pathology")
    order_id = order["id"]

    pay_offline(client, admin_token, order)
    patient_request_scan_slot(client, phone, order_id, admin_token)
    schedule_scan(client, admin_token, order_id)
    technician_complete_scan(
        client, tech_token, order_id, admin_token=admin_token, patient_phone=phone, patient_name="PKG2 Pathology"
    )
    assign_lab_and_upload_report(client, admin_token, order_id)
    generate_and_publish_report(client, admin_token, order_id)

    report = client.get(f"/api/v1/admin/orders/{order_id}/final-report", headers=auth_headers(admin_token))
    assert report.status_code == 200, report.text
    assert report.json()["data"]["status"] == "published"

    completed = complete_order(client, admin_token, order_id)
    assert completed["orderStatus"] == "completed"
