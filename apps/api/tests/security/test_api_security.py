"""API security tests: rate limiting, SQL injection probes, auth boundaries."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


API = "/api/v1"


def _burst(client: TestClient, method: str, url: str, *, count: int, **kwargs) -> list[int]:
    statuses: list[int] = []
    for _ in range(count):
        response = getattr(client, method)(url, **kwargs)
        statuses.append(response.status_code)
    return statuses


def test_public_enquiries_rate_limit_returns_429(client: TestClient):
    payload = {
        "patientName": "Rate Limit Test",
        "phone": "9876543210",
        "message": "Testing rate limit",
    }
    statuses = _burst(client, "post", f"{API}/public/enquiries", count=12, json=payload)
    assert 429 in statuses
    idx = statuses.index(429)
    response = client.post(f"{API}/public/enquiries", json=payload)
    if response.status_code == 429:
        assert response.headers.get("retry-after") is not None


def test_auth_login_rate_limit_returns_429(client: TestClient):
    payload = {"identifier": "admin@livotale.com", "password": "wrong-password"}
    statuses = _burst(client, "post", f"{API}/auth/login", count=25, json=payload)
    assert 429 in statuses


def test_otp_send_rate_limit_by_ip(client: TestClient):
    statuses = _burst(
        client,
        "post",
        f"{API}/patient-portal/otp/send",
        count=25,
        json={"phone": "9900000001"},
    )
    assert 429 in statuses


@pytest.mark.parametrize(
    "payload",
    [
        {"identifier": "admin' OR '1'='1", "password": "x"},
        {"identifier": "admin@livotale.com", "password": "'; DROP TABLE users--"},
    ],
)
def test_auth_login_sqli_probes_do_not_500(client: TestClient, payload: dict[str, str]):
    response = client.post(f"{API}/auth/login", json=payload)
    assert response.status_code in {401, 422, 400, 429}
    assert response.status_code != 500


def test_public_enquiry_sqli_probe_in_name(client: TestClient):
    response = client.post(
        f"{API}/public/enquiries",
        json={
            "patientName": "'; DROP TABLE commerce.enquiries--",
            "phone": "9876543210",
            "message": "test",
        },
    )
    assert response.status_code in {201, 422, 429}
    assert response.status_code != 500


def test_admin_routes_require_auth(client: TestClient):
    assert client.get(f"{API}/admin/orders").status_code == 401
    assert client.get(f"{API}/admin/staff/doctors/users").status_code in {401, 404, 422}


def test_doctor_routes_require_auth(client: TestClient):
    assert client.get(f"{API}/doctor/consultations").status_code == 401


def test_register_admin_role_rejected(client: TestClient):
    response = client.post(
        f"{API}/auth/register",
        json={
            "username": "evil.admin",
            "password": "EvilAdmin@123",
            "fullName": "Evil Admin",
            "email": "evil.admin@livotale.test",
            "role": "admin",
        },
    )
    assert response.status_code == 403
    assert response.json()["error"] == "forbidden"


def test_patient_portal_bank_details_phone_isolation(client: TestClient):
    response = client.get(f"{API}/patient-portal/bank-details", params={"phone": "9000000099"})
    assert response.status_code == 403


def test_internal_notifications_requires_key(client: TestClient):
    response = client.post(
        f"{API}/internal/notifications/emit",
        json={"event": "test", "payload": {}},
    )
    assert response.status_code in {401, 422}


def test_public_package_invalid_code_safe_response(client: TestClient):
    response = client.get(f"{API}/public/packages/../../etc/passwd")
    assert response.status_code in {404, 422, 400}


def test_openapi_lists_security_sensitive_routes(client: TestClient):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    assert f"{API}/public/enquiries" in paths or "/public/enquiries" in paths
    assert f"{API}/auth/login" in paths or "/auth/login" in paths
