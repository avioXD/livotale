# Patient Portal Hardening — Design Spec

**Date:** 2026-06-21  
**Scope:** Password login, API alignment, security fixes, feature inventory

---

## Current state

The patient portal uses **phone-in-query/body** as its session model after OTP verify. JWT exists for staff but was not wired for patient password login (`/auth/patient/login` was missing in FastAPI).

### Feature inventory (11 routes)

| Route | Feature | API surface |
|-------|---------|-------------|
| `/patient/login` | OTP + password login | `/patient-portal/otp/*`, `/auth/patient/login` |
| `/patient/onboarding` | First-time profile | `/patient-portal/onboarding/*` |
| `/patient` | Dashboard | orders, analytics, notifications preview |
| `/patient/profile` | Profile + refund bank details | profile, bank-details, storage |
| `/patient/notifications` | In-app inbox | `/patient-portal/org/notifications` |
| `/patient/downloads` | PDF download center | `/patient-portal/downloads` |
| `/patient/orders/:id` | Order detail + scheduling | orders, timeline, slots, WS |
| `/patient/orders/:id/pay` | Dummy checkout | `/patient-portal/orders/:id/pay` |
| `/patient/orders/:id/report` | Final report | final-report, liver-health-report |
| `/patient/orders/:id/prescription` | Published Rx | prescription |

---

## Feature slices (implementation order)

### F1 — Password login (this session)

**Problem:** UI calls `POST /auth/patient/login` which did not exist.

**Solution:**
- Add `POST /auth/patient/login` → `AuthService.login(portal=patient)` → map to `PatientPortalSession` including `needsOnboarding`.
- UI `loginWithPassword` consumes `PatientPortalSession` directly.
- Demo creds: `patient.rohan` / `Patient@123` (mobile `9900000001`).

### F2 — Phone param alignment

**Problem:** Several UI calls omit `phone` query param; backend allowed unauthenticated order access.

**Solution:**
- UI: pass `phone` on `getMyOrder`, scan/consult/pathology date requests.
- API: require `phone` on order read/mutation routes.

### F3 — Login UX

- Redirect `/patient/login` → dashboard/onboarding when session already in localStorage.
- Hydrate store on login page mount.

### F4 — Notification API unification (future)

Bell uses `/notifications/inbox/patient`; inbox page uses `/patient-portal/org/notifications`. Consolidate in a follow-up.

### F5 — PatientOrderDetail admin package fetch (future)

Replace `GET /admin/packages` with public or portal-scoped package metadata.

---

## Auth model (unchanged for now)

OTP and password login both produce a **localStorage session** `{ phone, patientId, patientName, needsOnboarding? }`. Portal APIs continue to use `?phone=` — no JWT on patient routes. Password login does not store staff JWT tokens.

Future improvement: issue a short-lived portal session token after OTP/password login.

---

## Test plan

| Test | Method |
|------|--------|
| Password login | `POST /auth/patient/login` with bootstrap patient |
| OTP login | existing contract tests |
| Bank details | existing contract tests |
| Order phone required | GET order without phone → 422 |
| UI password tab | manual on `/patient/login?mode=password` |

---

## Demo credentials

See `LOCAL_CREDENTIALS.md`:
- OTP: `9900000001` / `123456`
- Password: `patient.rohan` / `Patient@123`
