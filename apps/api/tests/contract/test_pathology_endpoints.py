"""Contract smoke tests for pathology lab partner workflow endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import (
    assign_lab_and_upload_report,
    auth_headers,
    create_order,
    login,
    pay_offline,
    patient_request_scan_slot,
    schedule_scan,
    technician_complete_scan,
)

MINIMAL_PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"


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


@pytest.fixture
def pathology_ready_order(client: TestClient, admin_token: str, tech_token: str) -> str:
    order, phone = create_order(client, admin_token, package_code="PKG-2", patient_name="Pathology Contract")
    order_id = order["id"]
    pay_offline(client, admin_token, order)
    patient_request_scan_slot(client, phone, order_id, admin_token)
    schedule_scan(client, admin_token, order_id)
    technician_complete_scan(
        client,
        tech_token,
        order_id,
        admin_token=admin_token,
        patient_phone=phone,
        patient_name="Pathology Contract",
    )
    return order_id


def test_pathology_endpoints_listed_in_openapi(client: TestClient):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/admin/orders/{order_id}/pathology-external-appointment" in paths
    assert "/admin/orders/{order_id}/lab-partner-visit" in paths


def test_external_appointment_requires_internal_ref(client: TestClient, admin_token: str, pathology_ready_order: str):
    headers = auth_headers(admin_token)
    labs = client.get("/api/v1/admin/staff/lab-partners", headers=headers)
    lab_id = labs.json()["data"][0]["id"]
    client.post(
        f"/api/v1/admin/orders/{pathology_ready_order}/assign-lab",
        headers=headers,
        json={"partnerLabId": lab_id},
    )
    response = client.patch(
        f"/api/v1/admin/orders/{pathology_ready_order}/pathology-external-appointment",
        headers=headers,
        json={"externalAppointmentId": "SHOULD-FAIL"},
    )
    assert response.status_code == 400, response.text


def test_lab_partner_collected_requires_visit(client: TestClient, admin_token: str, pathology_ready_order: str):
    headers = auth_headers(admin_token)
    labs = client.get("/api/v1/admin/staff/lab-partners", headers=headers)
    lab_id = labs.json()["data"][0]["id"]
    client.post(
        f"/api/v1/admin/orders/{pathology_ready_order}/assign-lab",
        headers=headers,
        json={"partnerLabId": lab_id},
    )
    client.post(f"/api/v1/admin/orders/{pathology_ready_order}/lab-partner-order", headers=headers)
    client.patch(
        f"/api/v1/admin/orders/{pathology_ready_order}/pathology-external-appointment",
        headers=headers,
        json={"externalAppointmentId": "EXT-001"},
    )
    from datetime import UTC, datetime, timedelta

    scheduled_at = (datetime.now(UTC) + timedelta(days=2)).isoformat().replace("+00:00", "Z")
    client.post(
        f"/api/v1/admin/orders/{pathology_ready_order}/schedule-pathology",
        headers=headers,
        json={"scheduledAt": scheduled_at, "timeSlot": "10:00–12:00"},
    )
    collected = client.post(
        f"/api/v1/admin/orders/{pathology_ready_order}/lab-partner-collected",
        headers=headers,
    )
    assert collected.status_code == 400, collected.text


def test_pathology_happy_path_endpoints(client: TestClient, admin_token: str, pathology_ready_order: str):
    assign_lab_and_upload_report(client, admin_token, pathology_ready_order)
    report = client.get(
        f"/api/v1/admin/orders/{pathology_ready_order}/pathology",
        headers=auth_headers(admin_token),
    )
    assert report.status_code == 200, report.text
    data = report.json()["data"]
    assert data is not None
    assert data["fileName"]
    assert data["extractionStatus"] in ("verified", "review_pending", "extracted")
