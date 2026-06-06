# Implementation Plan: Auth API Integration

**Branch**: `001-auth-api-integration` | **Date**: 2026-06-06 | **Spec**: [spec.md](./spec.md)

## Summary

Align livotel-ui authentication with the existing livotale_app Fastify API. Add response mapping for `{ data }` envelopes, switch login to username-based auth, route registration to `POST /patient/register`, and map API role codes to UI `AppRole` for RBAC guards.

## Technical Context

**Language/Version**: TypeScript 5.8 / React 19  
**Primary Dependencies**: axios, zustand, react-router-dom  
**Storage**: PostgreSQL via livotale_app API (identity + clinical schemas)  
**Testing**: Jest (UI), Vitest (API)  
**Target Platform**: Web (Vite)  
**Project Type**: SPA admin/clinical portal  
**Constraints**: No invented API routes; pnpm only  

## Constitution Check

| Gate | Status |
|------|--------|
| Spec exists before implementation | PASS |
| Pages → store → service layering | PASS |
| API contract fidelity | PASS |
| Unit tests for auth mappers | PASS |
| pnpm test/build before merge | Pending execution |

## Project Structure

```text
specs/001-auth-api-integration/
├── spec.md
├── plan.md
├── tasks.md
└── contracts/auth-api.md

livotel-ui/src/
├── types/auth.ts
├── utils/authMappers.ts
├── services/auth/AuthService.ts
├── services/base/BaseApiService.ts
├── store/auth/authStore.ts
├── app/pages/auth/LoginPage.tsx
├── app/pages/auth/RegisterPage.tsx
└── rbac/index.ts
```

## API Endpoints Used

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/login` | Username/password login → JWT |
| GET | `/auth/me` | Current user profile + roles |
| POST | `/patient/register` | Patient self-registration |
| GET | `/health` | Connectivity check |

## DB Understanding

- **identity.users**: login identity; `username` (citext), `password_hash` (scrypt), `full_name`, optional `email`/`mobile`.
- **identity.roles**: seeded codes — patient, doctor, technician, admin, health_coach, dietician, pharmacy, lab_partner.
- **identity.user_roles**: links users to roles (active when `ends_at IS NULL`).
- **clinical.patients**: created on patient register; required for patient-scoped endpoints.

## Implementation Phases

1. Types + mappers + service layer alignment
2. Auth store + pages update
3. RBAC role mapping extension (COACH for care team)
4. Integration test against live API
5. Unit tests + build verification
