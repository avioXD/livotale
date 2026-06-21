from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture(scope="module")
def staff_client() -> Iterator[TestClient]:
    with TestClient(create_app()) as test_client:
        yield test_client


def _login_admin(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@livotale.com", "password": "Admin@123"},
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]["accessToken"]


@pytest.fixture(scope="module")
def admin_token(staff_client: TestClient) -> str:
    return _login_admin(staff_client)


def test_doctors_list_users(staff_client: TestClient, admin_token: str):
    response = staff_client.get(
        "/api/v1/admin/staff/doctors/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    assert isinstance(response.json()["data"], list)


def test_doctors_dashboard(staff_client: TestClient, admin_token: str):
    response = staff_client.get(
        "/api/v1/admin/staff/doctors/org/dashboard",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    body = response.json()["data"]
    assert "kpis" in body
    assert body["headline"]


def test_doctors_onboard_profile_verify_and_clinical_sync(staff_client: TestClient, admin_token: str):
    headers = {"Authorization": f"Bearer {admin_token}"}
    mobile = f"+9196{int(__import__('time').time()) % 100000000:08d}"
    email = f"test.doctor.{int(__import__('time').time())}@livotale.test"
    registration = f"MCI-{int(__import__('time').time()) % 1000000:06d}"

    create = staff_client.post(
        "/api/v1/admin/staff/doctors/onboard",
        headers=headers,
        json={
            "fullName": "Test Doctor",
            "mobile": mobile,
            "email": email,
        },
    )
    assert create.status_code == 200, create.text
    invite = create.json()["data"]
    assert invite["roleKey"] == "doctor"
    member_id = invite["memberId"]

    profile = staff_client.get(
        f"/api/v1/admin/staff/doctors/{member_id}/profile",
        headers=headers,
    )
    assert profile.status_code == 200, profile.text
    assert profile.json()["data"]["fullName"] == "Test Doctor"

    patch = staff_client.patch(
        f"/api/v1/admin/staff/doctors/{member_id}/profile",
        headers=headers,
        json={
            "employee": {
                "registrationNumber": registration,
                "specialization": "Hepatology",
                "qualification": "MD",
                "clinicOrOrgName": "Livotale Clinic Kolkata",
                "homeCity": "Kolkata",
            },
            "status": "inactive",
        },
    )
    assert patch.status_code == 200, patch.text
    patched = patch.json()["data"]
    assert patched["employee"]["registrationNumber"] == registration
    assert patched["employee"]["specialization"] == "Hepatology"

    roster = staff_client.get("/api/v1/admin/doctors", headers=headers)
    assert roster.status_code == 200, roster.text
    doctor_row = next((row for row in roster.json()["data"] if str(row["id"]) == str(member_id)), None)
    assert doctor_row is not None
    assert doctor_row["registrationNumber"] == registration
    assert doctor_row["specialization"] == "Hepatology"
    assert doctor_row["qualification"] == "MD"

    verify = staff_client.post(
        f"/api/v1/admin/staff/doctors/{member_id}/verify",
        headers=headers,
    )
    assert verify.status_code == 200, verify.text
    verified = verify.json()["data"]
    assert verified["verificationStatus"] == "verified"
    assert verified["status"] == "active"

    roster_after = staff_client.get("/api/v1/admin/doctors", headers=headers)
    assert roster_after.status_code == 200, roster_after.text
    active_row = next((row for row in roster_after.json()["data"] if str(row["id"]) == str(member_id)), None)
    assert active_row is not None
    assert active_row["status"] == "active"

    listed = staff_client.get("/api/v1/admin/staff/doctors/users", headers=headers).json()["data"]
    assert any(str(row["id"]) == str(member_id) and row["status"] == "active" for row in listed)
