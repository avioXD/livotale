"""Technician field portal API integration tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import (
    DEMO_OTP,
    assign_first_technician,
    auth_headers,
    create_order,
    get_package,
    login,
    pay_offline,
    save_operator_intake,
    schedule_scan,
    technician_complete_scan,
    unique_phone,
)


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return login(client, "admin@livotale.com", "Admin@123")


@pytest.fixture
def tech_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "technician@livotale.com", "password": "Tech@123"},
    )
    if response.status_code != 200:
        pytest.skip("technician@livotale.com not available in test database")
    return response.json()["data"]["accessToken"]


def test_technician_intake_ops_save_auto_approved(client: TestClient, admin_token: str) -> None:
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Ops Auto Approve")
    order_id = order["id"]
    pay_offline(client, admin_token, order)

    response = client.put(
        f"/api/v1/admin/orders/{order_id}/patient-intake",
        headers=auth_headers(admin_token),
        json={
            "name": "Ops Auto Approve",
            "sex": "female",
            "age": 45,
            "phone": phone,
            "comorbidities": {"bloodPressure": False, "sugar": False, "thyroid": False},
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["data"]["operatorVerificationStatus"] == "approved"


def test_technician_order_includes_patient_address(client: TestClient, admin_token: str, tech_token: str):
    phone = unique_phone()
    enquiry = client.post(
        "/api/v1/public/enquiries",
        json={
            "patientName": "Tech Address Patient",
            "phone": phone,
            "address": "42 MG Road, Park Street",
            "city": "Kolkata",
        },
    ).json()["data"]

    pkg = get_package(client, admin_token, "PKG-1")
    assert pkg is not None

    order_response = client.post(
        "/api/v1/admin/orders",
        headers=auth_headers(admin_token),
        json={
            "patientName": "Tech Address Patient",
            "patientPhone": phone,
            "enquiryId": enquiry["id"],
            "packageId": pkg["id"],
        },
    )
    assert order_response.status_code == 200, order_response.text
    order_id = order_response.json()["data"]["id"]

    pay_offline(client, admin_token, order_response.json()["data"])
    schedule_scan(client, admin_token, order_id)

    detail = client.get(f"/api/v1/technician/orders/{order_id}", headers=auth_headers(tech_token))
    assert detail.status_code == 200, detail.text
    body = detail.json()["data"]
    assert "42 MG Road" in (body.get("address") or "")
    assert body.get("city") == "Kolkata"

    listed = client.get("/api/v1/technician/orders", headers=auth_headers(tech_token))
    assert listed.status_code == 200, listed.text
    row = next(row for row in listed.json()["data"] if row["id"] == order_id)
    assert "42 MG Road" in (row.get("address") or "")
    assert row.get("city") == "Kolkata"


def test_technician_order_detail_and_forbidden(client: TestClient, admin_token: str, tech_token: str):
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Tech Detail")
    order_id = order["id"]

    pay_offline(client, admin_token, order)
    assign_first_technician(client, admin_token, order_id)
    schedule_scan(client, admin_token, order_id)
    save_operator_intake(client, admin_token, order_id, phone=phone, patient_name="Tech Detail")

    forbidden = client.get(f"/api/v1/admin/orders/{order_id}", headers=auth_headers(tech_token))
    assert forbidden.status_code == 403, forbidden.text

    detail = client.get(f"/api/v1/technician/orders/{order_id}", headers=auth_headers(tech_token))
    assert detail.status_code == 200, detail.text
    body = detail.json()["data"]
    assert body["id"] == order_id
    assert body["patientPhone"] == phone
    assert body.get("visitStep") == "assigned"

    visit = client.get(f"/api/v1/technician/orders/{order_id}/visit", headers=auth_headers(tech_token))
    assert visit.status_code == 200, visit.text


def test_technician_intake_otp_and_full_visit(client: TestClient, admin_token: str, tech_token: str):
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Tech Full Visit")
    order_id = order["id"]

    pay_offline(client, admin_token, order)
    assign_first_technician(client, admin_token, order_id)
    schedule_scan(client, admin_token, order_id)

    technician_complete_scan(
        client,
        tech_token,
        order_id,
        admin_token=admin_token,
        patient_phone=phone,
        patient_name="Tech Full Visit",
    )

    scan = client.get(f"/api/v1/technician/orders/{order_id}/fibrosis-scan", headers=auth_headers(tech_token))
    assert scan.status_code == 200, scan.text
    assert scan.json()["data"]["scanFileUrl"]
    assert scan.json()["data"]["scanReportDocumentType"] == "scanner_pdf"

    visit = client.get(f"/api/v1/technician/orders/{order_id}/visit", headers=auth_headers(tech_token))
    assert visit.status_code == 200, visit.text
    assert visit.json()["data"]["visitStep"] == "scan_completed"


def test_complete_requires_report_upload(client: TestClient, admin_token: str, tech_token: str):
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Tech No Upload")
    order_id = order["id"]
    headers = auth_headers(tech_token)

    pay_offline(client, admin_token, order)
    assign_first_technician(client, admin_token, order_id)
    schedule_scan(client, admin_token, order_id)
    save_operator_intake(client, admin_token, order_id, phone=phone, patient_name="Tech No Upload")

    client.post(f"/api/v1/technician/orders/{order_id}/visit-started", headers=headers)
    client.post(f"/api/v1/technician/orders/{order_id}/reached", headers=headers)
    client.post(f"/api/v1/technician/orders/{order_id}/patient-intake/otp", headers=headers)
    client.post(
        f"/api/v1/technician/orders/{order_id}/patient-intake/verify",
        headers=headers,
        json={
            "name": "Tech No Upload",
            "sex": "female",
            "age": 45,
            "phone": phone,
            "comorbidities": {"bloodPressure": False, "sugar": False, "thyroid": False},
            "otp": DEMO_OTP,
        },
    )
    client.post(
        f"/api/v1/technician/orders/{order_id}/fibroscan-intake",
        headers=headers,
        json={
            "devicePatientCode": "DEV-002",
            "machinePatientName": "Tech No Upload",
            "machinePatientAge": 45,
            "machinePatientSex": "female",
            "machinePatientPhone": phone,
        },
    )
    client.post(
        f"/api/v1/technician/orders/{order_id}/fibrosis-scan",
        headers=headers,
        json={
            "liverStiffnessKpa": 5.5,
            "capDbm": 240,
            "iqr": 0.7,
            "iqrMedianPercent": 10,
            "validMeasurements": 10,
            "totalMeasurements": 10,
            "successRatePercent": 100,
            "probeType": "M",
            "scanAt": "2026-06-20T10:00:00Z",
            "operatorName": "Technician User",
            "deviceSerial": "FS-TEST-002",
            "fastingStatus": True,
            "bmi": 23.0,
            "interpretation": "Normal",
            "steatosisGrade": "S0",
            "fibrosisStage": "F0",
            "source": "manual",
        },
    )
    client.post(f"/api/v1/technician/orders/{order_id}/visit-completion-otp", headers=headers)

    complete = client.post(
        f"/api/v1/technician/orders/{order_id}/complete",
        headers=headers,
        json={"otp": DEMO_OTP},
    )
    assert complete.status_code == 400, complete.text


def test_technician_list_excludes_pathology_orders(client: TestClient, admin_token: str, tech_token: str):
    """After ops moves an order to pathology, it must disappear from the technician list."""
    from tests.integration.order_flow_helpers import assign_lab_and_upload_report

    order, phone = create_order(client, admin_token, package_code="PKG-2", patient_name="Tech List Filter")
    order_id = order["id"]
    tech_headers = auth_headers(tech_token)

    pay_offline(client, admin_token, order)
    assign_first_technician(client, admin_token, order_id)
    schedule_scan(client, admin_token, order_id)

    technician_complete_scan(
        client,
        tech_token,
        order_id,
        admin_token=admin_token,
        patient_phone=phone,
        patient_name="Tech List Filter",
    )

    listed = client.get("/api/v1/technician/orders", headers=tech_headers)
    assert listed.status_code == 200, listed.text
    ids_before = {row["id"] for row in listed.json()["data"]}
    assert order_id in ids_before

    assign_lab_and_upload_report(client, admin_token, order_id)

    listed_after = client.get("/api/v1/technician/orders", headers=tech_headers)
    assert listed_after.status_code == 200, listed_after.text
    ids_after = {row["id"] for row in listed_after.json()["data"]}
    assert order_id not in ids_after
