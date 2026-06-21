"""Integration tests for role-based patient registry zone scoping."""

from __future__ import annotations

import asyncio
import os
import time

import asyncpg
import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import auth_headers, login


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return login(client, "admin@livotale.com", "Admin@123")


@pytest.fixture
def ops_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "operations@livotale.com", "password": "Ops@123"},
    )
    if response.status_code != 200:
        pytest.skip("operations@livotale.com not available in test database")
    return response.json()["data"]["accessToken"]


@pytest.fixture
def doctor_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "doctor@livotale.com", "password": "Doctor@123"},
    )
    if response.status_code != 200:
        pytest.skip("doctor@livotale.com not available in test database")
    return response.json()["data"]["accessToken"]


def _create_patient_via_order(client: TestClient, admin_token: str) -> dict:
    packages = client.get("/api/v1/admin/packages", headers=auth_headers(admin_token))
    assert packages.status_code == 200, packages.text
    pkg = next((row for row in packages.json()["data"] if row.get("code") == "PKG-1"), None)
    if pkg is None:
        pytest.skip("PKG-1 package not seeded")

    suffix = int(time.time() * 1000) % 1_000_000_000
    phone = f"91{suffix:09d}"[-10:]
    patient_name = f"Zone Patient {suffix}"

    enquiry = client.post(
        "/api/v1/public/enquiries",
        json={"patientName": patient_name, "phone": phone, "age": 40, "gender": "male"},
    )
    assert enquiry.status_code == 201, enquiry.text

    order = client.post(
        "/api/v1/admin/orders",
        headers=auth_headers(admin_token),
        json={
            "patientName": patient_name,
            "patientPhone": phone,
            "enquiryId": enquiry.json()["data"]["id"],
            "packageId": pkg["id"],
        },
    )
    assert order.status_code == 200, order.text
    return order.json()["data"]


def _set_patient_default_pincode(patient_id: str, pincode: str) -> None:
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        pytest.skip("DATABASE_URL not configured")
    dsn = db_url.replace("postgresql+asyncpg://", "postgresql://")

    async def _run() -> None:
        conn = await asyncpg.connect(dsn)
        try:
            await conn.execute(
                "DELETE FROM clinical.patient_addresses WHERE patient_id = $1::uuid",
                patient_id,
            )
            await conn.execute(
                """
                INSERT INTO clinical.patient_addresses (
                  patient_id, address_type, line1, pincode, is_default
                )
                VALUES ($1::uuid, 'home', 'Test address', $2, true)
                """,
                patient_id,
                pincode,
            )
        finally:
            await conn.close()

    asyncio.run(_run())


def _ops_member(client: TestClient, admin_token: str) -> dict:
    headers = auth_headers(admin_token)
    ops_users = client.get("/api/v1/admin/staff/operations/users", headers=headers)
    assert ops_users.status_code == 200, ops_users.text
    return next(
        (row for row in ops_users.json()["data"] if row.get("email") == "operations@livotale.com"),
        ops_users.json()["data"][0],
    )


def _ops_member_doctor(client: TestClient, admin_token: str) -> dict:
    member = _ops_member(client, admin_token)
    doctors = client.get("/api/v1/admin/doctors", headers=auth_headers(admin_token))
    assert doctors.status_code == 200, doctors.text
    user_id = str(member.get("userId") or member["id"])
    doctor = next(
        (row for row in doctors.json()["data"] if str(row.get("userId")) == user_id),
        None,
    )
    if doctor is None:
        pytest.skip("Operations user doctor profile not seeded")
    return doctor


def _assign_ops_zones(client: TestClient, admin_token: str, *, city_manager: bool = False) -> tuple[str, str]:
    headers = auth_headers(admin_token)
    zones = client.get("/api/v1/admin/service-zones", headers=headers)
    assert zones.status_code == 200, zones.text
    zone_rows = zones.json()["data"]
    if not zone_rows:
        pytest.skip("No service zones seeded")
    zone = zone_rows[0]
    zone_id = zone["id"]
    in_pincode = zone["pincodes"][0] if zone.get("pincodes") else "700001"
    out_pincode = "999999"

    member = _ops_member(client, admin_token)
    meta = {
        "assignedServiceZoneIds": [zone_id],
        "assignedPincodes": [in_pincode],
    }
    if city_manager:
        meta["cityManagerServiceZoneIds"] = [zone_id]

    patch = client.patch(
        f"/api/v1/admin/staff/operations/{member['id']}/profile",
        headers=headers,
        json={"meta": meta},
    )
    assert patch.status_code == 200, patch.text
    return in_pincode, out_pincode


def test_admin_sees_all_patients(client: TestClient, admin_token: str):
    order = _create_patient_via_order(client, admin_token)
    _set_patient_default_pincode(order["patientId"], "999999")

    response = client.get(
        f"/api/v1/patients/{order['patientId']}",
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 200, response.text


def test_ops_sees_only_zone_patients(client: TestClient, admin_token: str, ops_token: str):
    in_pincode, out_pincode = _assign_ops_zones(client, admin_token)

    in_zone = _create_patient_via_order(client, admin_token)
    out_zone = _create_patient_via_order(client, admin_token)
    _set_patient_default_pincode(in_zone["patientId"], in_pincode)
    _set_patient_default_pincode(out_zone["patientId"], out_pincode)

    response = client.get(
        "/api/v1/patients?page=1&pageSize=50",
        headers=auth_headers(ops_token),
    )
    assert response.status_code == 200, response.text
    ids = {str(row["patientId"]) for row in response.json()["data"]["items"]}
    assert str(in_zone["patientId"]) in ids
    assert str(out_zone["patientId"]) not in ids


def test_ops_out_of_zone_detail_403(client: TestClient, admin_token: str, ops_token: str):
    _, out_pincode = _assign_ops_zones(client, admin_token)
    order = _create_patient_via_order(client, admin_token)
    _set_patient_default_pincode(order["patientId"], out_pincode)

    response = client.get(
        f"/api/v1/patients/{order['patientId']}",
        headers=auth_headers(ops_token),
    )
    assert response.status_code == 403, response.text


def test_doctor_cannot_access_unassigned_out_of_zone_patient(
    client: TestClient, admin_token: str, doctor_token: str
):
    _, out_pincode = _assign_ops_zones(client, admin_token)
    order = _create_patient_via_order(client, admin_token)
    _set_patient_default_pincode(order["patientId"], out_pincode)

    response = client.get(
        f"/api/v1/patients/{order['patientId']}",
        headers=auth_headers(doctor_token),
    )
    assert response.status_code == 403, response.text


def test_doctor_can_access_assigned_order_patient(
    client: TestClient, admin_token: str, doctor_token: str
):
    order = _create_patient_via_order(client, admin_token)
    order_id = order["id"]

    doctors = client.get("/api/v1/admin/doctors", headers=auth_headers(admin_token))
    doctor = next(
        (d for d in doctors.json()["data"] if d.get("fullName") == "Doctor User"),
        doctors.json()["data"][0],
    )

    assign = client.post(
        f"/api/v1/admin/orders/{order_id}/assign-doctor",
        headers=auth_headers(admin_token),
        json={"doctorId": doctor["id"], "doctorName": doctor["fullName"]},
    )
    assert assign.status_code == 200, assign.text

    response = client.get(
        f"/api/v1/patients/{order['patientId']}",
        headers=auth_headers(doctor_token),
    )
    assert response.status_code == 200, response.text


def test_ops_no_zones_excludes_unassigned_patients(client: TestClient, admin_token: str, ops_token: str):
    headers = auth_headers(admin_token)
    member = _ops_member(client, admin_token)
    patch = client.patch(
        f"/api/v1/admin/staff/operations/{member['id']}/profile",
        headers=headers,
        json={"meta": {"assignedServiceZoneIds": [], "assignedPincodes": [], "cityManagerServiceZoneIds": []}},
    )
    assert patch.status_code == 200, patch.text

    order = _create_patient_via_order(client, admin_token)
    _set_patient_default_pincode(order["patientId"], "999999")

    response = client.get(
        "/api/v1/patients?page=1&pageSize=50",
        headers=auth_headers(ops_token),
    )
    assert response.status_code == 200, response.text
    ids = {str(row["patientId"]) for row in response.json()["data"]["items"]}
    assert str(order["patientId"]) not in ids


def test_city_manager_sees_promoted_zone_patients(client: TestClient, admin_token: str, ops_token: str):
    headers = auth_headers(admin_token)
    zones = client.get("/api/v1/admin/service-zones", headers=headers)
    zone_rows = zones.json()["data"]
    if len(zone_rows) < 1:
        pytest.skip("No service zones seeded")
    zone = zone_rows[0]
    zone_id = zone["id"]
    in_pincode = zone["pincodes"][0] if zone.get("pincodes") else "700001"
    out_pincode = "888888"

    member = _ops_member(client, admin_token)
    patch = client.patch(
        f"/api/v1/admin/staff/operations/{member['id']}/profile",
        headers=headers,
        json={
            "meta": {
                "assignedServiceZoneIds": [zone_id],
                "assignedPincodes": [],
                "cityManagerServiceZoneIds": [zone_id],
            }
        },
    )
    assert patch.status_code == 200, patch.text

    in_zone = _create_patient_via_order(client, admin_token)
    out_zone = _create_patient_via_order(client, admin_token)
    _set_patient_default_pincode(in_zone["patientId"], in_pincode)
    _set_patient_default_pincode(out_zone["patientId"], out_pincode)

    response = client.get(
        "/api/v1/patients?page=1&pageSize=50",
        headers=auth_headers(ops_token),
    )
    assert response.status_code == 200, response.text
    ids = {str(row["patientId"]) for row in response.json()["data"]["items"]}
    assert str(in_zone["patientId"]) in ids
    assert str(out_zone["patientId"]) not in ids


def test_multi_role_union_sees_zone_and_doctor_assigned(
    client: TestClient, admin_token: str, ops_token: str
):
    in_pincode, out_pincode = _assign_ops_zones(client, admin_token, city_manager=False)

    in_zone = _create_patient_via_order(client, admin_token)
    assigned = _create_patient_via_order(client, admin_token)
    out_zone = _create_patient_via_order(client, admin_token)
    _set_patient_default_pincode(in_zone["patientId"], in_pincode)
    _set_patient_default_pincode(assigned["patientId"], out_pincode)
    _set_patient_default_pincode(out_zone["patientId"], out_pincode)

    doctor = _ops_member_doctor(client, admin_token)
    assign = client.post(
        f"/api/v1/admin/orders/{assigned['id']}/assign-doctor",
        headers=auth_headers(admin_token),
        json={"doctorId": doctor["id"], "doctorName": doctor["fullName"]},
    )
    assert assign.status_code == 200, assign.text

    response = client.get(
        "/api/v1/patients?page=1&pageSize=50",
        headers=auth_headers(ops_token),
    )
    assert response.status_code == 200, response.text
    ids = {str(row["patientId"]) for row in response.json()["data"]["items"]}
    assert str(in_zone["patientId"]) in ids
    assert str(out_zone["patientId"]) not in ids
    # Operations user has doctor role; order-linked patient visible via doctor union branch.
    assert str(assigned["patientId"]) in ids
