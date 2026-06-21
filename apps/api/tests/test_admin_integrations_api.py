from __future__ import annotations

import base64

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


def test_admin_integrations_settings_round_trip(client: TestClient) -> None:
    token = _admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    get_resp = client.get("/api/v1/admin/integrations/settings", headers=headers)
    assert get_resp.status_code == 200, get_resp.text

    put_resp = client.put(
        "/api/v1/admin/integrations/settings",
        headers=headers,
        json={
            "twilioAccountSid": "AC00000000000000000000000000000000",
            "twilioAuthToken": "test-auth-token",
            "twilioFromNumber": "+15555550100",
        },
    )
    assert put_resp.status_code == 200, put_resp.text
    body = put_resp.json()["data"]
    assert body["twilioAccountSid"] == "AC00000000000000000000000000000000"
    assert body["twilioFromNumber"] == "+15555550100"
    assert body["twilioAuthToken"].startswith("••••")
    assert body["twilioConfigured"] is True


def test_admin_integrations_settings_rejects_non_admin(client: TestClient) -> None:
    tech_resp = client.post(
        "/api/v1/auth/login",
        json={"identifier": "technician@livotale.com", "password": "Tech@123"},
    )
    assert tech_resp.status_code == 200, tech_resp.text
    token = tech_resp.json()["data"]["accessToken"]

    resp = client.put(
        "/api/v1/admin/integrations/settings",
        headers={"Authorization": f"Bearer {token}"},
        json={"twilioAccountSid": "ACtest"},
    )
    assert resp.status_code == 403
