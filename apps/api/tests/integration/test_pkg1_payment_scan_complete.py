"""PKG-1 full workflow: payment → scan → report → complete."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import (
    assign_first_technician,
    auth_headers,
    complete_order,
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


@pytest.fixture
def doctor_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "doctor@livotale.com", "password": "Doctor@123"},
    )
    if response.status_code != 200:
        pytest.skip("doctor@livotale.com not available in test database")
    return response.json()["data"]["accessToken"]


def test_pkg1_workflow_events_and_cancel(client: TestClient, admin_token: str):
    order, _phone = create_order(client, admin_token, package_code="PKG-1", patient_name="PKG1 Cancel")

    events = client.get(
        f"/api/v1/admin/orders/{order['id']}/workflow-events",
        headers=auth_headers(admin_token),
    )
    assert events.status_code == 200, events.text
    assert "cancel" in events.json()["data"]

    cancel = client.post(
        f"/api/v1/admin/orders/{order['id']}/transition",
        headers=auth_headers(admin_token),
        json={"event": "cancel"},
    )
    assert cancel.status_code == 200, cancel.text
    assert cancel.json()["data"]["orderStatus"] == "cancelled"


def test_pkg1_offline_payment_and_invoice(client: TestClient, admin_token: str):
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="PKG1 Payment")
    paid = pay_offline(client, admin_token, order)
    assert paid["paymentStatus"] == "success"

    invoice = client.get(
        f"/api/v1/patient-portal/orders/{order['id']}/invoice",
        params={"phone": phone},
    )
    assert invoice.status_code == 200, invoice.text
    assert invoice.json()["data"] is not None
    assert invoice.json()["data"]["orderId"] == order["id"]


def test_pkg1_full_happy_path(client: TestClient, admin_token: str, tech_token: str):
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="PKG1 Full Path")
    order_id = order["id"]

    pay_offline(client, admin_token, order)
    assign_first_technician(client, admin_token, order_id)
    schedule_scan(client, admin_token, order_id)
    technician_complete_scan(
        client, tech_token, order_id, admin_token=admin_token, patient_phone=phone, patient_name="PKG1 Full Path"
    )
    generate_and_publish_report(client, admin_token, order_id)

    events = client.get(
        f"/api/v1/admin/orders/{order_id}/workflow-events",
        headers=auth_headers(admin_token),
    )
    assert "complete" in events.json()["data"]

    completed = complete_order(client, admin_token, order_id)
    assert completed["orderStatus"] == "completed"

    report = client.get(
        f"/api/v1/patient-portal/orders/{order_id}/final-report",
        params={"phone": phone},
    )
    assert report.status_code == 200, report.text
    assert report.json()["data"]["status"] == "published"


def test_pkg1_technician_scan_endpoints(client: TestClient, admin_token: str, tech_token: str):
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="PKG1 Tech Scan")
    order_id = order["id"]

    pay_offline(client, admin_token, order)
    assign_first_technician(client, admin_token, order_id)
    schedule_scan(client, admin_token, order_id)
    technician_complete_scan(
        client, tech_token, order_id, admin_token=admin_token, patient_phone=phone, patient_name="PKG1 Tech Scan"
    )

    scan = client.get(f"/api/v1/technician/orders/{order_id}/fibrosis-scan", headers=auth_headers(tech_token))
    assert scan.status_code == 200, scan.text
    assert scan.json()["data"]["fibrosisStage"] == "F1"

    visit = client.get(f"/api/v1/technician/orders/{order_id}/visit", headers=auth_headers(tech_token))
    assert visit.status_code == 200, visit.text
    assert visit.json()["data"]["visitStep"] == "scan_completed"
