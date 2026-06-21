"""Integration tests for list filter API alignment (I03)."""

from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import auth_headers, login


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return login(client, "admin@livotale.com", "Admin@123")


def _create_patient_via_order(client: TestClient, admin_token: str) -> dict:
    packages = client.get("/api/v1/admin/packages", headers=auth_headers(admin_token))
    assert packages.status_code == 200, packages.text
    pkg = next((row for row in packages.json()["data"] if row.get("code") == "PKG-1"), None)
    if pkg is None:
        pytest.skip("PKG-1 package not seeded")

    suffix = int(time.time() * 1000) % 1_000_000_000
    phone = f"91{suffix:09d}"[-10:]
    patient_name = f"Filter Patient {suffix}"

    enquiry = client.post(
        "/api/v1/public/enquiries",
        json={"patientName": patient_name, "phone": phone, "age": 40, "gender": "male"},
    )
    assert enquiry.status_code == 201, enquiry.text

    order = client.post(
        "/api/v1/admin/orders",
        headers=auth_headers(admin_token),
        json={
            "patientName": patient_name,
            "patientPhone": phone,
            "enquiryId": enquiry.json()["data"]["id"],
            "packageId": pkg["id"],
        },
    )
    assert order.status_code == 200, order.text
    data = order.json()["data"]
    data["_patientName"] = patient_name
    data["_phone"] = phone
    return data


def test_patient_status_active_filter(client: TestClient, admin_token: str):
    """UI sends status=active; API maps to journey groups instead of exact match."""
    _create_patient_via_order(client, admin_token)
    response = client.get(
        "/api/v1/patients?status=active&pageSize=50",
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 200, response.text
    assert response.json()["data"]["total"] >= 0


def test_patient_search_by_phone(client: TestClient, admin_token: str):
    order = _create_patient_via_order(client, admin_token)
    phone = order["_phone"]
    response = client.get(
        f"/api/v1/patients?search={phone}",
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 200, response.text
    items = response.json()["data"]["items"]
    assert any(str(row["patientId"]) == str(order["patientId"]) for row in items)


def test_orders_created_by_role_operations(client: TestClient, admin_token: str):
    """createdByRole=operations must not 422 (maps to support role)."""
    response = client.get(
        "/api/v1/admin/orders?createdByRole=operations",
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 200, response.text
    assert isinstance(response.json()["data"], list)


def test_orders_search_patient_name(client: TestClient, admin_token: str):
    order = _create_patient_via_order(client, admin_token)
    name = order["_patientName"].split()[0]
    response = client.get(
        f"/api/v1/admin/orders?search={name.replace(' ', '+')}",
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 200, response.text
    items = response.json()["data"]
    assert any(str(row["id"]) == str(order["id"]) for row in items)


def test_consultation_queue_stage_filter(client: TestClient, admin_token: str):
    for stage in (
        "awaiting_doctor",
        "doctor_assigned",
        "scheduled",
        "prescription_pending",
        "prescription_ready",
        "completed",
    ):
        response = client.get(
            f"/api/v1/admin/consultations/queue?stage={stage}",
            headers=auth_headers(admin_token),
        )
        assert response.status_code == 200, response.text
        assert isinstance(response.json()["data"], list)
