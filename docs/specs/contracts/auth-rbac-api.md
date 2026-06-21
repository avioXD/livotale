# Auth & RBAC API Contract

Base URL: `VITE_API_BASE_URL` (default `http://localhost:4001`)

All responses use `{ data: T }` envelope unless error.

## POST /auth/login

```json
{
  "identifier": "doctor.iyer",
  "password": "Doctor@123"
}
```

`identifier` accepts username, email, or mobile (E.164).

**Response:**
```json
{
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": "8h",
    "sessionId": "uuid",
    "user": { "id": "...", "username": "...", "fullName": "...", "roles": ["doctor"] },
    "permissions": ["doctor.view_assigned_patient"]
  }
}
```

## POST /auth/refresh

```json
{ "refreshToken": "..." }
```

## POST /auth/logout

Requires Bearer token. Revokes current session.

## GET /auth/me

Returns user profile, roles, permissions, allowedPortals, context.

## GET /profile

Returns basic info, emergency contact, addresses, family members, insurance, identity verification.

## PATCH /profile/basic

```json
{ "fullName": "...", "email": "...", "mobile": "+91...", "gender": "male", "dob": "1984-03-12" }
```
