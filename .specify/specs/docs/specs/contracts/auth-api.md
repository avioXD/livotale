# Auth API Contract (livotale_app)

Base URL: `http://localhost:4000`

## POST /auth/login

**Request**
```json
{ "username": "doctor.iyer", "password": "Doctor@123" }
```

**Response 200**
```json
{
  "data": {
    "accessToken": "<jwt>",
    "tokenType": "Bearer",
    "expiresIn": "8h",
    "user": {
      "id": "<uuid>",
      "username": "doctor.iyer",
      "fullName": "Dr. Anuradha Iyer",
      "roles": ["doctor"]
    }
  }
}
```

## GET /auth/me

**Headers**: `Authorization: Bearer <jwt>`

**Response 200**
```json
{
  "data": {
    "id": "<uuid>",
    "username": "doctor.iyer",
    "full_name": "Dr. Anuradha Iyer",
    "email": "doctor.mock@livotale.test",
    "mobile": null,
    "roles": ["doctor"]
  }
}
```

## POST /patient/register

**Request**
```json
{
  "username": "patient.new",
  "password": "Patient@123",
  "fullName": "New Patient",
  "email": "new@example.com",
  "mobile": "+919999999999"
}
```

**Response 200**
```json
{
  "data": {
    "user": { "id": "<uuid>", "username": "patient.new", ... },
    "patient": { "id": "<uuid>", "patient_code": "MR-...", ... }
  }
}
```

Note: No token returned — client must call `/auth/login` after register.

## Role Code Mapping (API → UI)

| API code | UI AppRole |
|----------|------------|
| patient | PATIENT |
| doctor | DOCTOR |
| technician | TECHNICIAN |
| admin | ADMIN |
| health_coach, dietician | COACH |
| pharmacy, lab_partner | ADMIN (interim portal access) |

## Mock Credentials

| Role | Username | Password |
|------|----------|----------|
| Patient | patient.rohan | Patient@123 |
| Doctor | doctor.iyer | Doctor@123 |
| Technician | tech.vinod | Tech@123 |
| Admin | admin.ops | Admin@123 |
| Coach | coach.priya | Coach@123 |
