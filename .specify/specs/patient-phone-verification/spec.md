# Patient Phone Verification & OTP-Only Portal Login

**Status**: Implemented  
**Scope**: Operator + technician intake OTP, patient account commit, duplicate-phone guard, workflow notifications, remove patient password login

## Goal

When operator or technician verifies a patient phone via OTP during intake, commit the verified number to the patient registry, create or link a portal account, associate the order, reject numbers already owned by another patient, and notify ops + patient. Patient portal login is OTP-only.

## User stories

### P1 — Technician phone commit (field visit)

1. **Technician** edits phone at home visit, sends OTP to **form phone** (not stale order phone).
2. **Technician** verifies OTP → intake saved with `phoneOtpVerified=true`, `verifiedPhone` set.
3. **System** creates patient account if phone unused, updates same patient if unchanged, or returns `409` if phone belongs to another patient.
4. **System** re-links `service_orders.patient_id` when a new patient is created.
5. **Completion OTP** uses committed phone via `users.mobile`.

### P2 — Operator phone commit (pre-visit)

1. **Operator** changes phone or first save → OTP required before commit.
2. **Operator** sends OTP via `POST /admin/orders/{id}/patient-intake/otp` with `{ phone }`.
3. **Operator** verifies via `POST /admin/orders/{id}/patient-intake/verify` with intake + OTP.
4. **Operator** can save non-phone fields without OTP when phone unchanged and already verified.

### P3 — OTP-only patient login

1. **Patient** signs in at `/patient/login` via mobile OTP only.
2. **API** `POST /auth/patient/login` returns `410 Gone`.

### P4 — Workflow notification

1. After successful phone commit (operator or technician), emit `patient_intake_verified` to Operations role + patient phone inbox.

## API contracts

### POST `/technician/orders/{id}/patient-intake/otp`

Body: `{ phone }` — normalized and sent to Twilio/demo challenge. Purpose: `technician_intake`.

### POST `/technician/orders/{id}/patient-intake/verify`

Body: intake fields + `otp`. Verifies OTP against `body.phone`, commits patient, saves intake.

### POST `/admin/orders/{id}/patient-intake/otp`

Ops role. Body: `{ phone }`. Purpose: `operator_intake`.

### POST `/admin/orders/{id}/patient-intake/verify`

Ops role. Body: intake fields + `otp`. Same commit logic as technician verify.

### PUT `/admin/orders/{id}/patient-intake`

Ops role. Saves draft intake fields **without** phone commit when phone unchanged and already verified; otherwise use verify endpoint.

### Error: phone in use

HTTP `409`, error `phone_in_use`, message: `This phone number is already in use`.

## Intake fields (extended)

- `verifiedPhone` — last OTP-verified normalized phone
- `phoneOtpVerified` — boolean
- `operatorPhoneVerifiedAt` / `technicianVerifiedAt` — actor timestamps

## RBAC

- Technician OTP/verify: assigned technician only
- Operator OTP/verify: admin, support, city_manager (`is_ops_role`)

## Acceptance criteria

- OTP send/verify targets request body phone, not stale order join phone
- Duplicate phone on different patient → 409, intake not committed
- Unused phone → create patient + link order
- Same patient → update `users.mobile` and profile from intake
- `patient_intake_verified` notification to ops + patient
- Patient login page has no username/password tab
- Manual checklist scenarios 1–8 pass

## Related specs

- [21-technician-field-portal.md](../../docs/specs/features/21-technician-field-portal.md)
- [10-patient-portal.md](../../docs/specs/features/10-patient-portal.md)
- [otp-security.md](../../docs/specs/platform/otp-security.md)
- [workflow-notifications/spec.md](../workflow-notifications/spec.md)
