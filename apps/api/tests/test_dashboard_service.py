"""Dashboard summary contract and validation tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def _login_admin(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@livotale.com", "password": "Admin@123"},
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]["accessToken"]


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return _login_admin(client)


def test_dashboard_summary_revenue_month_lte_total(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/admin/dashboard/summary",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    revenue = response.json()["data"]["revenue"]
    assert "month" in revenue
    assert "total" in revenue
    assert revenue["month"] <= revenue["total"]


def test_dashboard_summary_enquiry_date_filter(client: TestClient, admin_token: str):
    unfiltered = client.get(
        "/api/v1/admin/dashboard/summary",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert unfiltered.status_code == 200, unfiltered.text
    total_enquiries = unfiltered.json()["data"]["enquiries"]["total"]

    filtered = client.get(
        "/api/v1/admin/dashboard/summary",
        params={"dateFrom": "2099-01-01T00:00:00Z", "dateTo": "2099-12-31T23:59:59Z"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert filtered.status_code == 200, filtered.text
    future_enquiries = filtered.json()["data"]["enquiries"]["total"]
    assert future_enquiries <= total_enquiries


def test_dashboard_summary_invalid_date_returns_422(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/admin/dashboard/summary",
        params={"dateFrom": "not-a-date"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 422, response.text


def test_dashboard_summary_invalid_uuid_returns_422(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/admin/dashboard/summary",
        params={"packageId": "not-a-uuid"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 422, response.text


def test_resolve_dashboard_scope_city_manager():
    from app.services.ops_scope_service import DashboardScope, resolve_dashboard_scope

    scope = DashboardScope(unrestricted=False, pincodes=["700015"], city_names=["Kolkata"])
    assert scope.is_scoped() is True


def test_admin_dashboard_unrestricted_for_admin(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/admin/dashboard/summary",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text

    response = client.get(
        "/api/v1/dashboard/overview",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    trends = response.json()["data"]["charts"]["clinicTrends"]
    assert isinstance(trends, list)
    assert len(trends) <= 12
