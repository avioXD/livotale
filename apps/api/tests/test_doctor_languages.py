from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture(scope="module")
def staff_client() -> Iterator[TestClient]:
    with TestClient(create_app()) as test_client:
        yield test_client


def _login(client: TestClient, identifier: str, password: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": identifier, "password": password},
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]["accessToken"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _seed_doctor(client: TestClient, admin_token: str) -> str:
    headers = _auth_headers(admin_token)
    mobile = f"+9196{int(__import__('time').time()) % 100000000:08d}"
    email = f"lang.doctor.{int(__import__('time').time())}@livotale.test"
    create = client.post(
        "/api/v1/admin/staff/doctors/onboard",
        headers=headers,
        json={"fullName": "Language Test Doctor", "mobile": mobile, "email": email},
    )
    assert create.status_code == 200, create.text
    return create.json()["data"]["memberId"]


def test_admin_can_set_doctor_languages_and_filter_roster(staff_client: TestClient):
    admin_token = _login(staff_client, "admin@livotale.com", "Admin@123")
    doctor_id = _seed_doctor(staff_client, admin_token)
    headers = _auth_headers(admin_token)

    save = staff_client.patch(
        f"/api/v1/admin/staff/doctors/{doctor_id}/profile",
        headers=headers,
        json={
            "meta": {
                "languagesKnown": ["Hindi", "Bengali", "English"],
            },
        },
    )
    assert save.status_code == 200, save.text
    profile = save.json()["data"]
    assert profile["employee"]["languagesKnown"] == ["Hindi", "Bengali", "English"]

    all_doctors = staff_client.get("/api/v1/admin/doctors", headers=headers)
    assert all_doctors.status_code == 200, all_doctors.text
    row = next(item for item in all_doctors.json()["data"] if item["id"] == doctor_id)
    assert set(row["languagesKnown"]) == {"Hindi", "Bengali", "English"}

    hindi_only = staff_client.get("/api/v1/admin/doctors", headers=headers, params={"language": "Hindi"})
    assert hindi_only.status_code == 200, hindi_only.text
    assert any(item["id"] == doctor_id for item in hindi_only.json()["data"])

    tamil_only = staff_client.get("/api/v1/admin/doctors", headers=headers, params={"language": "Tamil"})
    assert tamil_only.status_code == 200, tamil_only.text
    assert all(item["id"] != doctor_id for item in tamil_only.json()["data"])
