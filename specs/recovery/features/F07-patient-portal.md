# F07 — Patient Portal Recovery

**Priority**: P1  
**Status**: Routes exist; depends on order pipeline + notifications

---

## UI routes

| Route | Purpose |
|-------|---------|
| `/patient/login` | OTP + password login |
| `/patient/onboarding` | First-time profile |
| `/patient` | Dashboard overview |
| `/patient/orders` | Orders list with progress stepper |
| `/patient/orders/:id` | Order detail |
| `/patient/orders/:id/pay` | Checkout |
| `/patient/orders/:id/report` | Final + liver health report |
| `/patient/orders/:id/prescription` | Rx view |
| `/patient/profile` | Profile CRUD |
| `/patient/notifications` | In-app notifications |
| `/patient/downloads` | File list |

## Responsive shell

- Desktop: left sidebar (~240px)
- Mobile: bottom tab bar (4 tabs) + hamburger Sheet for Downloads/Support/Logout
- Breadcrumbs on nested order routes (desktop top bar + mobile page header)
- Order detail: sticky mobile Pay bar when payment pending

See `docs/superpowers/specs/2026-06-21-patient-portal-ui-redesign-design.md`.

---

## APIs (phone-scoped, mostly public)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/patient-portal/otp/send` | Demo OTP 123456 |
| POST | `/patient-portal/otp/verify` | Returns session |
| GET | `/patient-portal/orders?phone=` | List |
| GET | `/patient-portal/orders/:id` | Detail |
| POST | `/patient-portal/orders/:id/pay` | Demo payment |
| POST | `/patient-portal/orders/:id/scan-date` | Patient picks slot |
| POST | `/patient-portal/orders/:id/pathology-date` | Patient picks slot |
| GET/PATCH | `/patient-portal/profile` | |
| GET | `/patient-portal/downloads` | |
| GET | `/patient-portal/org/notifications` | |
| POST | `…/notifications/:id/read` | |

**Also used**: `GET /orders/:id/liver-health-report` (staff path — verify auth for patient)

---

## Edge cases

| # | Scenario | Expected |
|---|----------|----------|
| E1 | Phone with no orders | Empty list, friendly empty state |
| E2 | OTP wrong | 401 toast |
| E7 | OTP resend within 60s | 429 with retry countdown |
| E8 | 5 wrong verify attempts | 401 "Too many OTP attempts" |
| E3 | Pay before payment requested | 422 |
| E4 | View report before publish | 404 or "not ready" |
| E5 | WS without token | Reconnect with OTP session |
| E6 | Schedule scan date in past | Validation error |

---

## Dummy vs real

| Feature | Current |
|---------|---------|
| OTP | Demo mode (`OTP_MODE=demo`); rate limits disabled in demo |
| Payment checkout UI | Razorpay branding; dev simulate buttons only in `import.meta.env.DEV` |
| Notifications page | Real API inbox |

**Target**: Production builds hide dev-only payment simulate controls.

---

## DB

- `clinical.patients` (phone unique)
- `commerce.service_orders` linked by patient_id
- `audit.inbox_notifications` recipient_type=phone

---

## Tests

- Contract: OTP flow, order list, pay demo
- E2E S6 in test matrix
- Portal notification read flow
