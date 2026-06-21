import pytest

from app.services.staff_service import _ops_scope_from_meta


def test_ops_scope_from_meta_uses_service_zone_ids():
    zones = {
        "zone-a": {"id": "zone-a", "city": "Kolkata", "active": True, "pincodes": ["700015", "700016"]},
        "zone-b": {"id": "zone-b", "city": "Howrah", "active": True, "pincodes": ["711101"]},
    }
    scope = _ops_scope_from_meta(
        {
            "assignedServiceZoneIds": ["zone-a", "zone-b"],
            "assignedPincodes": ["700015", "711101"],
            "cityManagerServiceZoneIds": ["zone-a"],
        },
        zones,
    )
    assert scope["city"] == "Kolkata, Howrah"
    assert scope["pincodes"] == ["700015", "711101"]
    assert scope["is_city_manager_promoted"] is True
    assert scope["city_manager_service_zone_ids"] == ["zone-a"]


def test_ops_scope_from_meta_legacy_city_manager_flag():
    zones = {
        "zone-a": {"id": "zone-a", "city": "Kolkata", "active": True, "pincodes": ["700015"]},
    }
    scope = _ops_scope_from_meta(
        {
            "assignedCity": "Kolkata",
            "isCityManagerPromoted": True,
            "assignedPincodes": ["700015"],
        },
        zones,
    )
    assert scope["assigned_service_zone_ids"] == ["zone-a"]
    assert scope["is_city_manager_promoted"] is True
    assert scope["city_manager_service_zone_ids"] == ["zone-a"]


def test_normalize_operations_meta_limits_city_manager_zones():
    from app.services.staff_profile_service import StaffProfileService

    normalized = StaffProfileService._normalize_operations_meta(
        {
            "assignedServiceZoneIds": ["zone-a"],
            "assignedPincodes": ["700015"],
            "cityManagerServiceZoneIds": ["zone-a", "zone-b"],
        },
        {},
    )
    assert normalized["cityManagerServiceZoneIds"] == ["zone-a"]
    assert normalized["isCityManagerPromoted"] is True


@pytest.fixture(scope="module")
def staff_client():
    from collections.abc import Iterator

    from fastapi.testclient import TestClient

    from app.main import create_app

    with TestClient(create_app()) as test_client:
        yield test_client


def _login(client, identifier: str, password: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": identifier, "password": password},
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]["accessToken"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_operations_staff_and_service_zone_apis(staff_client):
    admin_token = _login(staff_client, "admin@livotale.com", "Admin@123")
    headers = _auth_headers(admin_token)

    zones = staff_client.get("/api/v1/admin/service-zones", headers=headers)
    assert zones.status_code == 200, zones.text
    zone_rows = zones.json()["data"]
    assert isinstance(zone_rows, list)

    ops_users = staff_client.get("/api/v1/admin/staff/operations/users", headers=headers)
    assert ops_users.status_code == 200, ops_users.text
    ops_rows = ops_users.json()["data"]
    assert isinstance(ops_rows, list)
    assert ops_rows, "Expected seeded operations user"

    ops_dashboard = staff_client.get("/api/v1/admin/staff/operations/org/dashboard", headers=headers)
    assert ops_dashboard.status_code == 200, ops_dashboard.text

    member = next((row for row in ops_rows if row.get("email") == "operations@livotale.com"), ops_rows[0])
    profile = staff_client.get(
        f"/api/v1/admin/staff/operations/{member['id']}/profile",
        headers=headers,
    )
    assert profile.status_code == 200, profile.text
    profile_body = profile.json()["data"]
    assert profile_body["role"] == "operations"

    if zone_rows:
        zone_id = zone_rows[0]["id"]
        pincode = zone_rows[0]["pincodes"][0] if zone_rows[0].get("pincodes") else None
        patch = staff_client.patch(
            f"/api/v1/admin/staff/operations/{member['id']}/profile",
            headers=headers,
            json={
                "meta": {
                    "assignedServiceZoneIds": [zone_id],
                    "assignedPincodes": [pincode] if pincode else [],
                    "cityManagerServiceZoneIds": [zone_id],
                },
            },
        )
        assert patch.status_code == 200, patch.text
        updated_meta = patch.json()["data"]["meta"]
        assert zone_id in updated_meta.get("assignedServiceZoneIds", [])
        assert updated_meta.get("isCityManagerPromoted") is True

        relisted = staff_client.get("/api/v1/admin/staff/operations/users", headers=headers)
        assert relisted.status_code == 200, relisted.text
        refreshed = next(row for row in relisted.json()["data"] if row["id"] == member["id"])
        assert refreshed.get("isCityManagerPromoted") is True
        assert refreshed.get("assignedServiceZoneIds") == [zone_id]

        staff_client.patch(
            f"/api/v1/admin/staff/operations/{member['id']}/profile",
            headers=headers,
            json={"meta": {"cityManagerServiceZoneIds": []}},
        )
