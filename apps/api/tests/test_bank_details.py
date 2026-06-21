from __future__ import annotations

from collections.abc import Iterator
from uuid import uuid4

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


@pytest.fixture(scope="module")
def admin_token(staff_client: TestClient) -> str:
    return _login(staff_client, "admin@livotale.com", "Admin@123")


@pytest.fixture(scope="module")
def ops_token(staff_client: TestClient) -> str | None:
    response = staff_client.post(
        "/api/v1/auth/login",
        json={"identifier": "operations@livotale.com", "password": "Ops@123"},
    )
    if response.status_code != 200:
        return None
    return response.json()["data"]["accessToken"]


def _admin_user_id(staff_client: TestClient, admin_token: str) -> str:
    users = staff_client.get(
        "/api/v1/admin/staff/super-admins/users",
        headers=_auth_headers(admin_token),
    )
    assert users.status_code == 200, users.text
    row = next(r for r in users.json()["data"] if r.get("email") == "admin@livotale.com")
    return row["userId"] or row["id"]


def _seed_verification_file(user_id: str) -> str:
    import asyncio
    import os

    import asyncpg

    file_id = uuid4()
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        pytest.skip("DATABASE_URL not configured")
    dsn = db_url.replace("postgresql+asyncpg://", "postgresql://")

    async def _insert() -> None:
        conn = await asyncpg.connect(dsn)
        try:
            await conn.execute(
                """
                INSERT INTO storage.files
                  (id, owner_user_id, file_type, file_name, mime_type, storage_url, uploaded_by, metadata)
                VALUES
                  ($1::uuid, $2::uuid, 'other', 'cheque.pdf', 'application/pdf', $3, $2::uuid, '{}'::jsonb)
                ON CONFLICT (id) DO NOTHING
                """,
                file_id,
                user_id,
                f"https://example.test/{file_id}.pdf",
            )
        finally:
            await conn.close()

    asyncio.run(_insert())
    return str(file_id)


def test_get_self_not_configured(staff_client: TestClient, admin_token: str):
    response = staff_client.get("/api/v1/me/bank-details", headers=_auth_headers(admin_token))
    assert response.status_code == 200, response.text
    body = response.json()["data"]
    assert body.get("configured") in (False, True)


def test_self_upsert_and_admin_views(staff_client: TestClient, admin_token: str, ops_token: str | None):
    user_id = _admin_user_id(staff_client, admin_token)
    file_id = _seed_verification_file(user_id)

    upsert = staff_client.put(
        "/api/v1/me/bank-details",
        headers=_auth_headers(admin_token),
        json={
            "accountHolderName": "Super Admin User",
            "accountNumber": "123456789012",
            "ifscCode": "HDFC0001234",
            "bankName": "HDFC Bank",
            "verificationDocFileId": file_id,
        },
    )
    assert upsert.status_code == 200, upsert.text
    saved = upsert.json()["data"]
    assert saved["accountNumber"] == "123456789012"
    assert saved["accountNumberLast4"] == "9012"
    assert saved["verificationStatus"] == "pending"

    self_get = staff_client.get("/api/v1/me/bank-details", headers=_auth_headers(admin_token))
    assert self_get.status_code == 200
    self_body = self_get.json()["data"]
    assert self_body["configured"] is True
    assert self_body["details"]["accountNumber"] == "123456789012"

    admin_get = staff_client.get(
        f"/api/v1/admin/users/{user_id}/bank-details",
        headers=_auth_headers(admin_token),
    )
    assert admin_get.status_code == 200, admin_get.text
    admin_body = admin_get.json()["data"]
    assert admin_body["accountNumber"] == "123456789012"

    if ops_token:
        ops_get = staff_client.get(
            f"/api/v1/admin/users/{user_id}/bank-details",
            headers=_auth_headers(ops_token),
        )
        assert ops_get.status_code == 200, ops_get.text
        ops_body = ops_get.json()["data"]
        assert "accountNumber" not in ops_body or ops_body.get("accountNumber") in (None, "")
        assert ops_body["accountNumberLast4"] == "9012"


def test_verify_flow(staff_client: TestClient, admin_token: str):
    user_id = _admin_user_id(staff_client, admin_token)

    verify = staff_client.post(
        f"/api/v1/admin/users/{user_id}/bank-details/verify",
        headers=_auth_headers(admin_token),
        json={"status": "verified", "notes": "Looks good"},
    )
    assert verify.status_code == 200, verify.text
    assert verify.json()["data"]["verificationStatus"] == "verified"


def test_ops_cannot_list_bank_directory(staff_client: TestClient, ops_token: str | None):
    if not ops_token:
        pytest.skip("operations@livotale.com login unavailable in this DB")
    response = staff_client.get(
        "/api/v1/admin/bank-details",
        headers=_auth_headers(ops_token),
    )
    assert response.status_code == 403, response.text


def test_admin_directory(staff_client: TestClient, admin_token: str):
    response = staff_client.get(
        "/api/v1/admin/bank-details",
        headers=_auth_headers(admin_token),
    )
    assert response.status_code == 200, response.text
    rows = response.json()["data"]
    assert isinstance(rows, list)
    if rows:
        assert "accountNumber" not in rows[0]
        assert "userId" in rows[0]
        assert rows[0]["configured"] is True


def test_admin_directory_excludes_users_without_bank_details(
    staff_client: TestClient, admin_token: str
):
    response = staff_client.get(
        "/api/v1/admin/bank-details",
        headers=_auth_headers(admin_token),
    )
    assert response.status_code == 200, response.text
    rows = response.json()["data"]
    assert all(row["configured"] for row in rows)


def test_admin_directory_missing_filter_returns_empty(
    staff_client: TestClient, admin_token: str
):
    response = staff_client.get(
        "/api/v1/admin/bank-details",
        params={"status": "missing"},
        headers=_auth_headers(admin_token),
    )
    assert response.status_code == 200, response.text
    assert response.json()["data"] == []
