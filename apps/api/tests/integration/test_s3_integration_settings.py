from __future__ import annotations

import base64
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _encryption_key(monkeypatch: pytest.MonkeyPatch) -> None:
    key = base64.urlsafe_b64encode(b"0" * 32).decode()
    monkeypatch.setenv("INTEGRATIONS_ENCRYPTION_KEY", key)


def _admin_token(client: TestClient) -> str:
    resp = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@livotale.com", "password": "Admin@123"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["accessToken"]


def test_s3_settings_round_trip_masks_secret(client: TestClient) -> None:
    token = _admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    put_resp = client.put(
        "/api/v1/admin/integrations/settings",
        headers=headers,
        json={
            "s3Bucket": "livotale-files",
            "s3Region": "ap-south-1",
            "s3KeyPrefix": "livotale",
            "s3AccessKeyId": "AKIATESTKEY",
            "s3SecretAccessKey": "super-secret-key",
        },
    )
    assert put_resp.status_code == 200, put_resp.text
    body = put_resp.json()["data"]
    assert body["s3Bucket"] == "livotale-files"
    assert body["s3Region"] == "ap-south-1"
    assert body["s3KeyPrefix"] == "livotale"
    assert body["s3AccessKeyId"] == "AKIATESTKEY"
    assert body["s3SecretAccessKey"].startswith("••••")
    assert body["s3Configured"] is True

    get_resp = client.get("/api/v1/admin/integrations/settings", headers=headers)
    assert get_resp.status_code == 200, get_resp.text
    get_body = get_resp.json()["data"]
    assert get_body["s3Configured"] is True
    assert get_body["s3SecretAccessKey"].startswith("••••")


def test_s3_settings_blank_secret_keeps_existing(client: TestClient) -> None:
    token = _admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    client.put(
        "/api/v1/admin/integrations/settings",
        headers=headers,
        json={
            "s3Bucket": "bucket-a",
            "s3Region": "ap-south-1",
            "s3AccessKeyId": "AKIAA",
            "s3SecretAccessKey": "secret-a",
        },
    )

    update_resp = client.put(
        "/api/v1/admin/integrations/settings",
        headers=headers,
        json={"s3Bucket": "bucket-b"},
    )
    assert update_resp.status_code == 200, update_resp.text
    body = update_resp.json()["data"]
    assert body["s3Bucket"] == "bucket-b"
    assert body["s3Configured"] is True


def test_integration_status_includes_s3_configured(client: TestClient) -> None:
    token = _admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    client.put(
        "/api/v1/admin/integrations/settings",
        headers=headers,
        json={
            "s3Bucket": "status-bucket",
            "s3Region": "ap-south-1",
            "s3AccessKeyId": "AKIASTATUS",
            "s3SecretAccessKey": "status-secret",
        },
    )

    status_resp = client.get("/api/v1/admin/integrations/status", headers=headers)
    assert status_resp.status_code == 200, status_resp.text
    assert status_resp.json()["data"]["s3Configured"] is True


def test_test_storage_endpoint(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    token = _admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    mock_result = {
        "ok": True,
        "bucket": "livotale-files",
        "region": "ap-south-1",
        "endpoint": None,
    }

    mock_service = MagicMock()
    mock_service.test_connection.return_value = mock_result
    monkeypatch.setattr(
        "app.api.v1.routers.admin.integrations.S3Service",
        lambda config: mock_service,
    )

    resp = client.post("/api/v1/admin/integrations/settings/test-storage", headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["ok"] is True
    assert data["bucket"] == "livotale-files"
    assert data["region"] == "ap-south-1"
