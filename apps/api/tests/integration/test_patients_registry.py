"""Integration tests for staff patient registry endpoints."""

from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import auth_headers, login


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return login(client, "admin@livotale.com", "Admin@123")


@pytest.fixture
def doctor_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "doctor@livotale.com", "password": "Doctor@123"},
    )
    if response.status_code != 200:
        pytest.skip("doctor@livotale.com not available in test database")
    return response.json()["data"]["accessToken"]


def _create_patient_via_order(
    client: TestClient, admin_token: str, *, package_code: str = "PKG-1"
) -> dict:
    packages = client.get("/api/v1/admin/packages", headers=auth_headers(admin_token))
    assert packages.status_code == 200, packages.text
    pkg = next((row for row in packages.json()["data"] if row.get("code") == package_code), None)
    if pkg is None:
        pytest.skip(f"{package_code} package not seeded")

    suffix = int(time.time() * 1000) % 1_000_000_000
    phone = f"91{suffix:09d}"[-10:]
    patient_name = f"Registry Patient {suffix}"

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
    return data


def test_list_patients_pagination(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/patients?page=1&pageSize=5",
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert "items" in data
    assert "total" in data
    assert data["page"] == 1
    assert data["pageSize"] == 5


def test_list_patients_search_and_filters(client: TestClient, admin_token: str):
    order = _create_patient_via_order(client, admin_token)
    patient_id = order["patientId"]
    patient_name = order["_patientName"]

    search = client.get(
        f"/api/v1/patients?search={patient_name.replace(' ', '+')}",
        headers=auth_headers(admin_token),
    )
    assert search.status_code == 200, search.text
    items = search.json()["data"]["items"]
    assert any(str(row["patientId"]) == str(patient_id) for row in items)

    status = client.get(
        "/api/v1/patients?status=registered",
        headers=auth_headers(admin_token),
    )
    assert status.status_code == 200, status.text


def test_get_patient_detail(client: TestClient, admin_token: str):
    order = _create_patient_via_order(client, admin_token)
    response = client.get(
        f"/api/v1/patients/{order['patientId']}",
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["summaryCard"]["name"] == order.get("_patientName", "Registry Test Patient")
    assert "patient" in data
    assert "addresses" in data


def test_get_patient_history(client: TestClient, admin_token: str):
    order = _create_patient_via_order(client, admin_token)
    response = client.get(
        f"/api/v1/patients/{order['patientId']}/history",
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    for key in ("conditions", "medications", "allergies", "familyMembers"):
        assert key in data


def test_get_clinical_context(client: TestClient, admin_token: str):
    order = _create_patient_via_order(client, admin_token)
    response = client.get(
        f"/api/v1/patients/{order['patientId']}/clinical",
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert any(row["id"] == order["id"] for row in data["orders"])
    assert isinstance(data["payments"], list)
    assert isinstance(data["appointments"], list)
    if data["appointments"]:
        appt = data["appointments"][0]
        assert "scheduledAt" in appt or appt.get("scheduledAt") is None
        assert "status" in appt


def test_patch_demographics_ops(client: TestClient, admin_token: str):
    order = _create_patient_via_order(client, admin_token)
    response = client.patch(
        f"/api/v1/patients/{order['patientId']}/demographics",
        headers=auth_headers(admin_token),
        json={"fullName": "Registry Updated Name", "occupation": "Engineer"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["data"]["summaryCard"]["name"] == "Registry Updated Name"


def test_patch_demographics_doctor_forbidden(client: TestClient, admin_token: str, doctor_token: str):
    order = _create_patient_via_order(client, admin_token)
    response = client.patch(
        f"/api/v1/patients/{order['patientId']}/demographics",
        headers=auth_headers(doctor_token),
        json={"fullName": "Doctor Edit Attempt"},
    )
    assert response.status_code == 403, response.text


def test_patch_history_section(client: TestClient, admin_token: str):
    order = _create_patient_via_order(client, admin_token)
    response = client.patch(
        f"/api/v1/patients/{order['patientId']}/history/medications",
        headers=auth_headers(admin_token),
        json={
            "items": [
                {
                    "medicineName": "Metformin",
                    "dose": "500mg",
                    "frequency": "daily",
                    "isCurrent": True,
                }
            ]
        },
    )
    assert response.status_code == 200, response.text
    meds = response.json()["data"]["medications"]
    assert any(row.get("medicineName") == "Metformin" or row.get("medicine_name") == "Metformin" for row in meds)


def test_doctor_assigned_patients(client: TestClient, admin_token: str, doctor_token: str):
    order = _create_patient_via_order(client, admin_token, package_code="PKG-3")
    doctors = client.get("/api/v1/admin/doctors", headers=auth_headers(admin_token))
    assert doctors.status_code == 200, doctors.text
    doctor_rows = doctors.json()["data"]
    assert doctor_rows, "No doctors seeded"
    doctor = next((d for d in doctor_rows if d.get("fullName") == "Doctor User"), doctor_rows[0])

    assign = client.post(
        f"/api/v1/admin/orders/{order['id']}/assign-doctor",
        headers=auth_headers(admin_token),
        json={"doctorId": doctor["id"], "doctorName": doctor["fullName"]},
    )
    assert assign.status_code == 200, assign.text

    response = client.get(
        "/api/v1/doctor/consultations/patients",
        headers=auth_headers(doctor_token),
    )
    assert response.status_code == 200, response.text
    rows = response.json()["data"]
    assert any(str(row["patientId"]) == str(order["patientId"]) for row in rows)


def test_doctor_can_access_assigned_patient(client: TestClient, admin_token: str, doctor_token: str):
    order = _create_patient_via_order(client, admin_token)
    doctors = client.get("/api/v1/admin/doctors", headers=auth_headers(admin_token))
    doctor = next((d for d in doctors.json()["data"] if d.get("fullName") == "Doctor User"), doctors.json()["data"][0])

    assign = client.post(
        f"/api/v1/admin/orders/{order['id']}/assign-doctor",
        headers=auth_headers(admin_token),
        json={"doctorId": doctor["id"], "doctorName": doctor["fullName"]},
    )
    assert assign.status_code == 200, assign.text

    response = client.get(
        f"/api/v1/patients/{order['patientId']}",
        headers=auth_headers(doctor_token),
    )
    assert response.status_code == 200, response.text


def test_doctor_cannot_access_unassigned_patient(client: TestClient, admin_token: str, doctor_token: str):
    order = _create_patient_via_order(client, admin_token)
    response = client.get(
        f"/api/v1/patients/{order['patientId']}",
        headers=auth_headers(doctor_token),
    )
    assert response.status_code == 403, response.text
