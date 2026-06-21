def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_login_requires_identifier(client):
    response = client.post("/api/v1/auth/login", json={"password": "secret"})
    assert response.status_code == 422


def test_login_rejects_empty_password(client):
    response = client.post("/api/v1/auth/login", json={"identifier": "admin", "password": ""})
    assert response.status_code == 422


def test_patient_portal_otp_send_requires_phone(client):
    response = client.post("/api/v1/patient-portal/otp/send", json={})
    assert response.status_code == 422
