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
    token = response.json()["data"]["accessToken"]
    assert token
    return token


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def admin_token(staff_client: TestClient) -> str:
    return _login(staff_client, "admin@livotale.com", "Admin@123")


@pytest.fixture(scope="module")
def ops_token(staff_client: TestClient) -> str:
    return _login(staff_client, "operations@livotale.com", "Ops@123")


def test_archive_check_for_active_technician(staff_client: TestClient, admin_token: str):
    technicians = staff_client.get(
        "/api/v1/admin/staff/technicians/users",
        headers=_auth_headers(admin_token),
    )
    assert technicians.status_code == 200, technicians.text
    rows = technicians.json()["data"]
    assert rows, "Expected at least one technician in seed data"
    member_id = rows[0]["id"]

    response = staff_client.get(
        f"/api/v1/admin/staff/technicians/users/{member_id}/archive-check",
        headers=_auth_headers(admin_token),
    )
    assert response.status_code == 200, response.text
    body = response.json()["data"]
    assert body["memberId"] == member_id
    assert "canArchive" in body
    assert "blockers" in body
    assert isinstance(body["blockers"], list)


def test_archive_flow_for_onboarded_inactive_user(staff_client: TestClient, admin_token: str):
    headers = _auth_headers(admin_token)
    mobile = f"+9198{int(__import__('time').time()) % 100000000:08d}"
    email = f"archive.test.{int(__import__('time').time())}@livotale.test"

    create = staff_client.post(
        "/api/v1/admin/staff/technicians/users",
        headers=headers,
        json={
            "fullName": "Archive Test Technician",
            "mobile": mobile,
            "email": email,
            "status": "inactive",
        },
    )
    assert create.status_code == 200, create.text
    member_id = create.json()["data"]["id"]

    check = staff_client.get(
        f"/api/v1/admin/staff/technicians/users/{member_id}/archive-check",
        headers=headers,
    )
    assert check.status_code == 200, check.text
    assert check.json()["data"]["canArchive"] is True

    archive = staff_client.post(
        f"/api/v1/admin/staff/technicians/users/{member_id}/archive",
        headers=headers,
    )
    assert archive.status_code == 200, archive.text
    archived = archive.json()["data"]
    assert archived["member"]["status"] == "archived"
    assert archived["member"]["archivedAt"] is not None

    recheck = staff_client.get(
        f"/api/v1/admin/staff/technicians/users/{member_id}/archive-check",
        headers=headers,
    )
    assert recheck.status_code == 200, recheck.text
    assert recheck.json()["data"]["alreadyArchived"] is True
    assert recheck.json()["data"]["canArchive"] is False


def test_operator_can_archive_technician(staff_client: TestClient, ops_token: str):
    technicians = staff_client.get(
        "/api/v1/admin/staff/technicians/users",
        headers=_auth_headers(ops_token),
    )
    assert technicians.status_code == 200, technicians.text
    inactive = next((r for r in technicians.json()["data"] if r["status"] == "inactive"), None)
    if not inactive:
        pytest.skip("No inactive technician available for operator archive test")

    check = staff_client.get(
        f"/api/v1/admin/staff/technicians/users/{inactive['id']}/archive-check",
        headers=_auth_headers(ops_token),
    )
    assert check.status_code == 200, check.text


def test_operator_cannot_archive_super_admin(staff_client: TestClient, ops_token: str):
    admins = staff_client.get(
        "/api/v1/admin/staff/super-admins/users",
        headers=_auth_headers(ops_token),
    )
    assert admins.status_code == 200, admins.text
    rows = admins.json()["data"]
    assert rows
    member_id = rows[0]["id"]

    response = staff_client.get(
        f"/api/v1/admin/staff/super-admins/users/{member_id}/archive-check",
        headers=_auth_headers(ops_token),
    )
    assert response.status_code == 403, response.text


def test_cannot_archive_self(staff_client: TestClient, admin_token: str):
    admins = staff_client.get(
        "/api/v1/admin/staff/super-admins/users",
        headers=_auth_headers(admin_token),
    )
    assert admins.status_code == 200, admins.text
    self_row = next(r for r in admins.json()["data"] if r.get("email") == "admin@livotale.com")

    response = staff_client.get(
        f"/api/v1/admin/staff/super-admins/users/{self_row['id']}/archive-check",
        headers=_auth_headers(admin_token),
    )
    assert response.status_code == 403, response.text


def test_super_admin_can_check_archive_for_all_staff_roles(staff_client: TestClient, admin_token: str):
    headers = _auth_headers(admin_token)
    role_slugs = ["technicians", "doctors", "lab-partners", "operations", "super-admins"]

    for slug in role_slugs:
        users = staff_client.get(f"/api/v1/admin/staff/{slug}/users", headers=headers)
        assert users.status_code == 200, users.text
        rows = users.json()["data"]
        if not rows:
            continue

        admin_email = "admin@livotale.com"
        target = next((r for r in rows if r.get("email") != admin_email), rows[0])
        response = staff_client.get(
            f"/api/v1/admin/staff/{slug}/users/{target['id']}/archive-check",
            headers=headers,
        )
        if slug == "super-admins" and target.get("email") == admin_email:
            assert response.status_code == 403, response.text
        elif slug == "super-admins":
            assert response.status_code == 403, response.text
        else:
            assert response.status_code == 200, response.text


def test_unarchive_restores_inactive_user(staff_client: TestClient, admin_token: str):
    headers = _auth_headers(admin_token)
    mobile = f"+9197{int(__import__('time').time()) % 100000000:08d}"
    email = f"unarchive.test.{int(__import__('time').time())}@livotale.test"

    create = staff_client.post(
        "/api/v1/admin/staff/technicians/users",
        headers=headers,
        json={
            "fullName": "Unarchive Test Technician",
            "mobile": mobile,
            "email": email,
            "status": "inactive",
        },
    )
    assert create.status_code == 200, create.text
    member_id = create.json()["data"]["id"]

    archive = staff_client.post(
        f"/api/v1/admin/staff/technicians/users/{member_id}/archive",
        headers=headers,
    )
    assert archive.status_code == 200, archive.text
    assert archive.json()["data"]["member"]["status"] == "archived"

    unarchive = staff_client.post(
        f"/api/v1/admin/staff/technicians/users/{member_id}/unarchive",
        headers=headers,
    )
    assert unarchive.status_code == 200, unarchive.text
    restored = unarchive.json()["data"]
    assert restored["member"]["status"] == "inactive"
    assert restored["member"]["archivedAt"] is None
    assert "unarchived" in restored["message"].lower()

    repeat = staff_client.post(
        f"/api/v1/admin/staff/technicians/users/{member_id}/unarchive",
        headers=headers,
    )
    assert repeat.status_code == 409, repeat.text


def test_operator_cannot_unarchive_super_admin(staff_client: TestClient, ops_token: str, admin_token: str):
    admins = staff_client.get(
        "/api/v1/admin/staff/super-admins/users",
        headers=_auth_headers(admin_token),
    )
    assert admins.status_code == 200, admins.text
    archived_admin = next(
        (r for r in admins.json()["data"] if r.get("email") != "admin@livotale.com" and r["status"] == "archived"),
        None,
    )
    if not archived_admin:
        pytest.skip("No archived super admin available for operator unarchive test")

    response = staff_client.post(
        f"/api/v1/admin/staff/super-admins/users/{archived_admin['id']}/unarchive",
        headers=_auth_headers(ops_token),
    )
    assert response.status_code == 403, response.text
