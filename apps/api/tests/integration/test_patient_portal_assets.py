"""Patient portal published assets after workflow completion."""

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


def test_patient_portal_otp_pay_and_report(client: TestClient, admin_token: str, tech_token: str):
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Portal Assets")
    order_id = order["id"]

    pay_offline(client, admin_token, order)
    assign_first_technician(client, admin_token, order_id)
    schedule_scan(client, admin_token, order_id)
    technician_complete_scan(
        client, tech_token, order_id, admin_token=admin_token, patient_phone=phone, patient_name="Portal Assets"
    )
    generate_and_publish_report(client, admin_token, order_id)
    complete_order(client, admin_token, order_id)

    otp_send = client.post("/api/v1/patient-portal/otp/send", json={"phone": phone})
    assert otp_send.status_code == 200, otp_send.text

    session = client.post("/api/v1/patient-portal/otp/verify", json={"phone": phone, "otp": "123456"})
    assert session.status_code == 200, session.text

    invoice = client.get(f"/api/v1/patient-portal/orders/{order_id}/invoice", params={"phone": phone})
    assert invoice.status_code == 200, invoice.text
    assert invoice.json()["data"] is not None

    report = client.get(f"/api/v1/patient-portal/orders/{order_id}/final-report", params={"phone": phone})
    assert report.status_code == 200, report.text
    assert report.json()["data"]["publishedAt"] is not None

    downloads = client.get("/api/v1/patient-portal/downloads", params={"phone": phone})
    assert downloads.status_code == 200, downloads.text
    types = {item["type"] for item in downloads.json()["data"]}
    assert "invoice" in types
    assert "report" in types


def test_technician_partner_labs(client: TestClient, tech_token: str):
    response = client.get("/api/v1/technician/partner-labs", headers=auth_headers(tech_token))
    assert response.status_code == 200, response.text
    assert isinstance(response.json()["data"], list)
