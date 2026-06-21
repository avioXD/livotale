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
    token = response.json()["data"]["accessToken"]
    assert token
    return token


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def admin_token(staff_client: TestClient) -> str:
    return _login_admin(staff_client)


def test_super_admins_list_users(staff_client: TestClient, admin_token: str):
    response = staff_client.get(
        "/api/v1/admin/staff/super-admins/users",
        headers=_auth_headers(admin_token),
    )
    assert response.status_code == 200, response.text
    rows = response.json()["data"]
    assert isinstance(rows, list)
    assert any(r.get("email") == "admin@livotale.com" for r in rows)


def test_super_admins_dashboard(staff_client: TestClient, admin_token: str):
    response = staff_client.get(
        "/api/v1/admin/staff/super-admins/org/dashboard",
        headers=_auth_headers(admin_token),
    )
    assert response.status_code == 200, response.text
    body = response.json()["data"]
    assert "kpis" in body
    assert len(body["kpis"]) >= 1


def test_super_admins_supporting_endpoints(staff_client: TestClient, admin_token: str):
    headers = _auth_headers(admin_token)
    for path in (
        "/api/v1/admin/staff/technicians",
        "/api/v1/admin/doctors",
        "/api/v1/admin/sample-collections/analytics?period=monthly",
    ):
        response = staff_client.get(path, headers=headers)
        assert response.status_code == 200, f"{path}: {response.text}"


def test_super_admins_onboard_and_profile_flow(staff_client: TestClient, admin_token: str):
    headers = _auth_headers(admin_token)
    mobile = f"+9199{int(__import__('time').time()) % 100000000:08d}"
    email = f"test.super.admin.{int(__import__('time').time())}@livotale.test"

    create = staff_client.post(
        "/api/v1/admin/staff/super-admins/onboard",
        headers=headers,
        json={
            "fullName": "Test Super Admin",
            "mobile": mobile,
            "email": email,
        },
    )
    assert create.status_code == 200, create.text
    invite = create.json()["data"]
    assert invite["memberId"]
    assert invite["roleKey"] == "super_admin"

    send = staff_client.post(
        f"/api/v1/admin/staff/onboard/{invite['token']}/send-link",
        headers=headers,
    )
    assert send.status_code == 200, send.text
    assert send.json()["data"]["status"] == "link_sent"

    member_id = invite["memberId"]
    profile = staff_client.get(
        f"/api/v1/admin/staff/super-admins/{member_id}/profile",
        headers=headers,
    )
    assert profile.status_code == 200, profile.text
    profile_body = profile.json()["data"]
    assert profile_body["fullName"] == "Test Super Admin"

    patch = staff_client.patch(
        f"/api/v1/admin/staff/super-admins/{member_id}/profile",
        headers=headers,
        json={
            "employee": {
                "homeCity": "Kolkata",
                "homeState": "West Bengal",
                "clinicOrOrgName": "Platform HQ",
            },
            "status": "inactive",
        },
    )
    assert patch.status_code == 200, patch.text
    assert patch.json()["data"]["employee"]["homeCity"] == "Kolkata"

    verify = staff_client.post(
        f"/api/v1/admin/staff/super-admins/{member_id}/verify",
        headers=headers,
    )
    assert verify.status_code == 200, verify.text
    assert verify.json()["data"]["verificationStatus"] == "verified"

    update_user = staff_client.patch(
        f"/api/v1/admin/staff/super-admins/users/{member_id}",
        headers=headers,
        json={"status": "active", "fullName": "Test Super Admin Active"},
    )
    assert update_user.status_code == 200, update_user.text
    assert update_user.json()["data"]["status"] == "active"

    listed = staff_client.get(
        "/api/v1/admin/staff/super-admins/users",
        headers=headers,
    ).json()["data"]
    assert any(str(r["id"]) == str(member_id) for r in listed)

    invites = staff_client.get(
        "/api/v1/admin/staff/super-admins/onboard",
        headers=headers,
    )
    assert invites.status_code == 200, invites.text
    assert any(i["mobile"] == mobile for i in invites.json()["data"])
