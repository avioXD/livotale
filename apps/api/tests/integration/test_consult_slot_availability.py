"""Consult slot availability checks."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import auth_headers, login


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return login(client, "admin@livotale.com", "Admin@123")


def test_list_doctors_available_for_slot_returns_list(client: TestClient, admin_token: str) -> None:
    scheduled = (datetime.now(UTC) + timedelta(days=4)).replace(microsecond=0).isoformat()
    response = client.get(
        "/api/v1/admin/doctors/available-for-slot",
        headers=auth_headers(admin_token),
        params={"scheduledAt": scheduled},
    )
    assert response.status_code == 200, response.text
    assert isinstance(response.json()["data"], list)
