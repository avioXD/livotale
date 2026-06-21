# FibroScan Intake API Design

**Date:** 2026-06-20  
**Status:** Approved for implementation  
**Related:** [21-technician-field-portal.md](../../specs/features/21-technician-field-portal.md), [03-orders-workflow.md](../../specs/features/03-orders-workflow.md)

## Overview

FibroScan intake is step 2 of the technician field visit workflow. After patient details are verified with phone OTP (step 1), the technician submits device session details (patient code + machine demographics). Operations validates or rejects that submission on the admin scan step.

Technicians may start scan capture while ops validation is still **pending**; ops approval is not required before `POST /fibrosis-scan` or `/fibrosis-scan/fetch`.

## Data model

Table: `clinical.scan_patient_intake`

| Column | Set when |
|--------|----------|
| `data` (JSONB) | All intake fields (camelCase keys in API) |
| `patient_verified` | Technician patient OTP verify |
| `fibroscan_intake_submitted` | Technician fibroscan-intake submit |
| `fibroscan_intake_verified` | Ops approve fibroscan intake |

Key JSONB fields for fibroscan intake:

- `devicePatientCode`, `machinePatientName`, `machinePatientAge`, `machinePatientSex`, `machinePatientPhone`
- `fibroscanIntakeSubmittedAt`, `fibroscanIntakeSubmittedBy`
- `fibroscanOperatorVerificationStatus`: `pending` | `approved` | `rejected`
- `fibroscanOperatorVerifiedAt`, `fibroscanOperatorVerifiedBy`, `fibroscanOperatorNotes`

## API contract

| Action | Method | Path | Role | Preconditions | Success |
|--------|--------|------|------|---------------|---------|
| Read intake | GET | `/technician/orders/{id}/patient-intake` | technician, admin, support | — | `ScanPatientIntake` or null |
| Submit fibroscan intake | POST | `/technician/orders/{id}/fibroscan-intake` | technician | Assigned order; `technicianVerifiedAt` set | `fibroscanIntakeSubmittedAt`, `fibroscanOperatorVerificationStatus=pending`, `fibroscan_intake_submitted=true` |
| Ops validate | PATCH | `/admin/orders/{id}/fibroscan-intake/verify` | admin, support, city_manager | `fibroscanIntakeSubmittedAt` present | `fibroscanOperatorVerificationStatus`; `fibroscan_intake_verified=true` on approve |
| Resubmit after reject | POST | `/technician/orders/{id}/fibroscan-intake` | technician | Prior status `rejected` | Resets status to `pending` |

### Request bodies

**POST fibroscan-intake** (`FibroScanIntakeInput`):

```json
{
  "devicePatientCode": "FS-PRIYA-38",
  "machinePatientName": "Priya Sharma",
  "machinePatientAge": 45,
  "machinePatientSex": "female",
  "machinePatientPhone": "9876543210"
}
```

**PATCH fibroscan-intake/verify** (`OperatorVerifyIntakeInput`):

```json
{ "status": "approved", "notes": "Optional validation notes" }
```

### Error responses

| Condition | Status | Message |
|-----------|--------|---------|
| Fibroscan submit before patient OTP verify | 400 | Submit patient details intake before FibroScan intake |
| Ops verify with no fibroscan submit | 400 | FibroScan intake not submitted |
| Save/fetch scan before fibroscan submit | 400 | Submit FibroScan intake before saving/fetching scan data |

## Timeline events

| Event key | When | UI label |
|-----------|------|----------|
| `fibroscan_intake_submitted` | Technician submit | FibroScan intake submitted by technician |
| `fibroscan_intake_approved` | Ops approve | FibroScan intake validated by operations |
| `fibroscan_intake_rejected` | Ops reject | FibroScan intake rejected by operations |

Do **not** emit generic `fibroscan_intake_ops_verified`.

## Patient intake merge rule

When technician verifies patient intake (`POST .../patient-intake/verify`), merge with existing JSONB (ops pre-fill) rather than replacing the row. Same pattern as `PUT .../patient-intake`.

## Tests

Integration: `tests/integration/test_fibroscan_intake.py`  
E2E: `e2e/technician-field-orders.spec.ts` (step 2 submit + ops validate)
