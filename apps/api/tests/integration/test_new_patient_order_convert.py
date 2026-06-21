"""Integration test: enquiry convert creates new patient without existing UUID."""

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


def test_new_patient_order_convert(client: TestClient, admin_token: str):
    packages_response = client.get(
        "/api/v1/admin/packages",
        headers=_auth_headers(admin_token),
    )
    assert packages_response.status_code == 200, packages_response.text
    packages = packages_response.json()["data"]
    pkg = next((row for row in packages if row.get("code") == "PKG-1"), None)
    if pkg is None:
        pytest.skip("PKG-1 package not seeded")

    suffix = int(time.time() * 1000) % 1_000_000_000
    phone = f"91{suffix:09d}"[-10:]

    enquiry_response = client.post(
        "/api/v1/public/enquiries",
        json={
            "patientName": "Brand New Patient",
            "phone": phone,
            "age": 42,
            "gender": "female",
        },
    )
    assert enquiry_response.status_code == 201, enquiry_response.text
    enquiry_id = enquiry_response.json()["data"]["id"]

    order_response = client.post(
        "/api/v1/admin/orders",
        headers=_auth_headers(admin_token),
        json={
            "patientName": "Brand New Patient",
            "patientPhone": phone,
            "patientIntake": {
                "name": "Brand New Patient",
                "sex": "female",
                "age": 42,
                "phone": phone,
                "comorbidities": {"bloodPressure": False, "sugar": False, "thyroid": False},
            },
            "enquiryId": enquiry_id,
            "packageId": pkg["id"],
            "skipPatientCreation": False,
        },
    )
    assert order_response.status_code == 200, order_response.text
    order = order_response.json()["data"]
    assert order["enquiryId"] == enquiry_id
    assert order["patientId"]
    assert order["packageCode"] == "PKG-1"

    intake_response = client.put(
        f"/api/v1/admin/orders/{order['id']}/patient-intake",
        headers=_auth_headers(admin_token),
        json={
            "name": "Brand New Patient",
            "sex": "female",
            "age": 42,
            "phone": phone,
            "comorbidities": {"bloodPressure": False, "sugar": False, "thyroid": False},
        },
    )
    assert intake_response.status_code == 200, intake_response.text

    patient_response = client.get(
        f"/api/v1/patients/{order['patientId']}",
        headers=_auth_headers(admin_token),
    )
    assert patient_response.status_code == 200, patient_response.text

    clinical_response = client.get(
        f"/api/v1/patients/{order['patientId']}/clinical",
        headers=_auth_headers(admin_token),
    )
    assert clinical_response.status_code == 200, clinical_response.text
    clinical = clinical_response.json()["data"]
    assert any(o["id"] == order["id"] for o in clinical["orders"])

    history_response = client.get(
        f"/api/v1/patients/{order['patientId']}/history",
        headers=_auth_headers(admin_token),
    )
    assert history_response.status_code == 200, history_response.text
    history = history_response.json()["data"]
    assert "conditions" in history
    assert "medications" in history

    patch_response = client.patch(
        f"/api/v1/patients/{order['patientId']}/demographics",
        headers=_auth_headers(admin_token),
        json={"occupation": "Test Occupation"},
    )
    assert patch_response.status_code == 200, patch_response.text
