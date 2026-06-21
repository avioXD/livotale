import pytest

API = "/api/v1"


def test_openapi_lists_core_routers(client):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    assert any("/patient-portal/otp/send" in path for path in paths)
    assert any("/patient-portal/bank-details" in path for path in paths)
    assert any("/auth/patient/login" in path for path in paths)
    assert any("/notifications/inbox" in path for path in paths)
    assert any("/admin/staff/{role_slug}/users" in path for path in paths)
    assert any("/admin/service-zones" in path for path in paths)
    assert any("/public/enquiries" in path for path in paths)


def test_patient_portal_verify_rejects_bad_otp(client):
    response = client.post(
        f"{API}/patient-portal/otp/verify",
        json={"phone": "9999999999", "otp": "000000"},
    )
    assert response.status_code == 401
    body = response.json()
    assert body["error"] == "app_error"


def test_patient_portal_send_returns_sent_flag(client):
    response = client.post(
        f"{API}/patient-portal/otp/send",
        json={"phone": "9900000001"},
    )
    assert response.status_code in (200, 429), response.text
    if response.status_code == 200:
        data = response.json()["data"]
        assert data["sent"] is True
        assert "retryAfterSeconds" in data


def test_patient_portal_verify_registers_new_phone(client):
    phone = "9812345678"
    client.post(f"{API}/patient-portal/otp/send", json={"phone": phone})
    response = client.post(
        f"{API}/patient-portal/otp/verify",
        json={"phone": phone, "otp": "123456"},
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["phone"]
    assert data["patientId"]
    assert data["needsOnboarding"] is True


def test_patient_portal_bank_details_unconfigured_for_new_patient(client):
    phone = "9823456789"
    client.post(f"{API}/patient-portal/otp/send", json={"phone": phone})
    verify = client.post(
        f"{API}/patient-portal/otp/verify",
        json={"phone": phone, "otp": "123456"},
    )
    assert verify.status_code == 200, verify.text

    response = client.get(f"{API}/patient-portal/bank-details", params={"phone": phone})
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["configured"] is False


def test_patient_portal_bank_details_requires_portal_access(client):
    response = client.get(f"{API}/patient-portal/bank-details", params={"phone": "9000000000"})
    assert response.status_code == 403


def test_patient_password_login_returns_gone(client):
    response = client.post(
        f"{API}/auth/patient/login",
        json={"identifier": "patient.pwdtest", "password": "Patient@123"},
    )
    assert response.status_code == 410


def test_patient_portal_order_requires_phone(client):
    response = client.get(f"{API}/patient-portal/orders/00000000-0000-0000-0000-000000000001")
    assert response.status_code == 422


def test_notifications_inbox_requires_auth(client):
    response = client.get(f"{API}/notifications/inbox")
    assert response.status_code == 401


def test_envelope_shape_on_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert "status" in response.json()


def test_public_enquiries_accepts_website_form(client):
    response = client.post(
        f"{API}/public/enquiries",
        json={
            "patientName": "Test Patient",
            "phone": "9876543210",
            "message": "Interested in PKG-1",
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert "data" in body
    assert body["data"]["patientName"] == "Test Patient"
