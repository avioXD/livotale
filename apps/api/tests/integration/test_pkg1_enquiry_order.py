"""Integration tests for PKG-1 enquiry → order flow (Scenario S2)."""

from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient


def _login_admin(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@livotale.com", "password": "Admin@123"},
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]["accessToken"]


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return _login_admin(client)


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_public_enquiry_visible_to_admin(client: TestClient, admin_token: str):
    suffix = int(time.time() * 1000) % 1_000_000_000
    phone = f"98{suffix:09d}"[-10:]

    create_response = client.post(
        "/api/v1/public/enquiries",
        json={
            "patientName": "Recovery Test Patient",
            "phone": phone,
            "message": "PKG-1 integration test enquiry",
        },
    )
    assert create_response.status_code == 201, create_response.text
    enquiry = create_response.json()["data"]
    assert enquiry["phone"] == phone

    list_response = client.get(
        "/api/v1/admin/enquiries",
        params={"search": phone},
        headers=_auth_headers(admin_token),
    )
    assert list_response.status_code == 200, list_response.text
    rows = list_response.json()["data"]
    assert any(row["id"] == enquiry["id"] for row in rows)


def test_enquiry_convert_to_order(client: TestClient, admin_token: str):
    packages_response = client.get(
        "/api/v1/admin/packages",
        headers=_auth_headers(admin_token),
    )
    assert packages_response.status_code == 200, packages_response.text
    packages = packages_response.json()["data"]
    pkg = next((row for row in packages if row.get("code") == "PKG-1"), None)
    if pkg is None:
        pytest.skip("PKG-1 package not seeded")

    orders_response = client.get(
        "/api/v1/admin/orders",
        headers=_auth_headers(admin_token),
    )
    assert orders_response.status_code == 200, orders_response.text
    existing_orders = orders_response.json()["data"]
    if not existing_orders:
        pytest.skip("No seeded orders/patients available for convert test")

    patient_id = existing_orders[0]["patientId"]
    suffix = int(time.time() * 1000) % 1_000_000_000
    phone = f"97{suffix:09d}"[-10:]

    enquiry_response = client.post(
        "/api/v1/public/enquiries",
        json={
            "patientName": "Order Convert Test",
            "phone": phone,
            "message": "Convert to PKG-1 order",
        },
    )
    assert enquiry_response.status_code == 201, enquiry_response.text
    enquiry_id = enquiry_response.json()["data"]["id"]

    order_response = client.post(
        "/api/v1/admin/orders",
        headers=_auth_headers(admin_token),
        json={
            "patientId": patient_id,
            "enquiryId": enquiry_id,
            "packageId": pkg["id"],
            "skipPatientCreation": True,
        },
    )
    assert order_response.status_code == 200, order_response.text
    order = order_response.json()["data"]
    assert order["enquiryId"] == enquiry_id
    assert order["packageCode"] == "PKG-1"

    enquiry_get = client.get(
        f"/api/v1/admin/enquiries/{enquiry_id}",
        headers=_auth_headers(admin_token),
    )
    assert enquiry_get.status_code == 200, enquiry_get.text
    assert enquiry_get.json()["data"]["status"] == "converted"
