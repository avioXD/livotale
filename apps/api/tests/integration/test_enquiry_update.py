"""Integration tests for enquiry PATCH and soft-delete."""

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


def test_enquiry_update_fields(client: TestClient, admin_token: str):
    suffix = int(time.time() * 1000) % 1_000_000_000
    phone = f"93{suffix:09d}"[-10:]

    create = client.post(
        "/api/v1/public/enquiries",
        json={"patientName": "Patch Test", "phone": phone},
    )
    assert create.status_code == 201, create.text
    enquiry_id = create.json()["data"]["id"]

    patch = client.patch(
        f"/api/v1/admin/enquiries/{enquiry_id}",
        headers=_auth_headers(admin_token),
        json={
            "patientName": "Patch Test Updated",
            "age": 45,
            "gender": "male",
            "address": "12 Park Street, Kolkata",
            "orderOutcome": "confirmed",
            "orderOutcomeRemarks": "Paid offline",
        },
    )
    assert patch.status_code == 200, patch.text
    data = patch.json()["data"]
    assert data["patientName"] == "Patch Test Updated"
    assert data["age"] == 45
    assert data["gender"] == "male"
    assert data["address"] == "12 Park Street, Kolkata"
    assert data["orderOutcome"] == "confirmed"


def test_enquiry_soft_delete(client: TestClient, admin_token: str):
    suffix = int(time.time() * 1000) % 1_000_000_000
    phone = f"92{suffix:09d}"[-10:]

    create = client.post(
        "/api/v1/public/enquiries",
        json={"patientName": "Delete Test", "phone": phone},
    )
    assert create.status_code == 201, create.text
    enquiry_id = create.json()["data"]["id"]

    delete = client.delete(
        f"/api/v1/admin/enquiries/{enquiry_id}",
        headers=_auth_headers(admin_token),
    )
    assert delete.status_code == 204, delete.text

    get = client.get(
        f"/api/v1/admin/enquiries/{enquiry_id}",
        headers=_auth_headers(admin_token),
    )
    assert get.status_code == 404, get.text
