"""Patient portal enquiry list/detail integration tests."""

from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import auth_headers, create_order, login, unique_phone


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return login(client, "admin@livotale.com", "Admin@123")


def test_patient_portal_lists_enquiries_by_phone(client: TestClient, admin_token: str) -> None:
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Portal Enquiry Patient")

    suffix = int(time.time() * 1000) % 1_000_000_000
    open_enquiry = client.post(
        "/api/v1/public/enquiries",
        json={
            "patientName": "Portal Enquiry Patient",
            "phone": phone,
            "message": "Follow-up enquiry from portal patient",
        },
    )
    assert open_enquiry.status_code == 201, open_enquiry.text
    open_row = open_enquiry.json()["data"]

    response = client.get("/api/v1/patient-portal/enquiries", params={"phone": phone})
    assert response.status_code == 200, response.text
    rows = response.json()["data"]
    assert len(rows) >= 2
    ids = {row["id"] for row in rows}
    assert open_row["id"] in ids
    assert order["enquiryId"] in ids

    open_match = next(row for row in rows if row["id"] == open_row["id"])
    assert open_match["patientStatusLabel"] == "Submitted"
    assert open_match["status"] == "new"
    assert "internalNotes" not in open_match
    assert "callRemarks" not in open_match


def test_converted_enquiry_includes_order_link(client: TestClient, admin_token: str) -> None:
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Converted Enquiry Patient")

    response = client.get("/api/v1/patient-portal/enquiries", params={"phone": phone})
    assert response.status_code == 200, response.text
    converted = next(row for row in response.json()["data"] if row["id"] == order["enquiryId"])
    assert converted["status"] == "converted"
    assert converted["patientStatusLabel"] == "Order created"
    assert converted["orderId"] == order["id"]
    assert converted["orderNumber"] == order["orderNumber"]


def test_patient_portal_enquiry_detail(client: TestClient, admin_token: str) -> None:
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Detail Enquiry Patient")
    enquiry_id = order["enquiryId"]

    response = client.get(
        f"/api/v1/patient-portal/enquiries/{enquiry_id}",
        params={"phone": phone},
    )
    assert response.status_code == 200, response.text
    row = response.json()["data"]
    assert row["id"] == enquiry_id
    assert row["orderId"] == order["id"]


def test_patient_portal_enquiry_forbidden_without_portal_patient(client: TestClient) -> None:
    phone = unique_phone()
    client.post(
        "/api/v1/public/enquiries",
        json={"patientName": "No Portal Patient", "phone": phone},
    )
    response = client.get("/api/v1/patient-portal/enquiries", params={"phone": phone})
    assert response.status_code == 403, response.text


def test_patient_portal_enquiry_detail_wrong_phone(client: TestClient, admin_token: str) -> None:
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Wrong Phone Patient")
    other_phone = unique_phone()

    response = client.get(
        f"/api/v1/patient-portal/enquiries/{order['enquiryId']}",
        params={"phone": other_phone},
    )
    assert response.status_code in (403, 404), response.text
