from __future__ import annotations

import base64

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect


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


def test_notifications_websocket_accepts_valid_token(client: TestClient) -> None:
    token = _admin_token(client)
    with client.websocket_connect(f"/ws/v1/notifications?role=admin&token={token}") as ws:
        ws.send_text("ping")


def test_notifications_websocket_rejects_missing_token(client: TestClient) -> None:
    with client.websocket_connect("/ws/v1/notifications?role=admin") as ws:
        with pytest.raises(WebSocketDisconnect):
            ws.receive_text()
