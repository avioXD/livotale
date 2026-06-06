# Feature Specification: Patient Journey Flow

**Feature Branch**: `002-patient-journey` | **Created**: 2026-06-06 | **Status**: Approved

## Objective

End-to-end patient workflow: registration → AI pre-screening → home visit → technician data collection → AI draft prescription → doctor approval.

**Onboarding gate (P1):** After login or register, patients with incomplete onboarding MUST see only the mobile-first `/patient-journey` wizard until a home visit is booked. No admin shell, sidebar, or other routes until onboarding completes.

## User Stories (Priority Order)

### P1 — Patient Onboarding Gate (NEW)
After login/register, if onboarding is incomplete, patient is redirected to `/patient-journey` inside a full-screen mobile layout. All other routes are blocked until home visit is booked.

**Acceptance:**
- New register → only onboarding visible
- Incomplete patient login → only onboarding visible
- Complete patient login → normal app with dashboard
- Staff login → unaffected

### P1 — Patient Registration & Onboarding
Collect full name, gender, DOB, mobile, email, address, liver symptoms questionnaire, risk assessment, optional report uploads. Status → `registered`.

### P1 — AI Pre-Screening
Rule-based engine uses registration + questionnaire data. Outputs risk score, recommended tests, package (3M/6M/1Y). Status → `ai_screened`.

### P1 — Home Visit Booking
Patient schedules visit; checklist auto-created. Status → `visit_booked`. **Onboarding completes here.**

### P1 — Technician Field Workflow
Consent, vitals (BMI auto-calc), FibroScan, blood sample. Uses existing technician APIs.

### P1 — AI Draft Prescription
Triggered when FibroScan + lab results exist. Draft hidden from patient.

### P1 — Doctor Approval
Doctor reviews/edits/approves/signs. Patient sees only approved prescriptions.

## Onboarding Complete Definition

| Condition | Onboarding complete |
|-----------|---------------------|
| `journey_status` ≥ `visit_booked` | Yes |
| `journey_timestamps.appointmentBooking` set | Yes |
| Only registered / AI screened | No |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/patient/register` | Extended with address, risk factors |
| GET | `/patient/onboarding/status` | Lightweight onboarding gate check |
| GET | `/patient/journey` | Full status + `onboardingComplete` + `currentStep` |
| GET | `/patient/questionnaires/:code` | Fetch active questionnaire |
| POST | `/patient/questionnaires/:code/responses` | Submit answers |
| POST | `/patient/onboarding/complete` | Profile, address, risk factors |
| POST | `/patient/reports/upload` | Register report file metadata |
| POST | `/patient/ai/prescreen` | Run AI pre-screening |
| GET | `/patient/ai/assessment` | Latest assessment + recommendations |
| GET/POST | `/patient/home-visits` | List / book (+ checklist bootstrap) |

## Mobile UX Requirements

- Full viewport height (`100dvh`) onboarding shell
- Sticky header with logo + sign out
- Single-column forms, touch-friendly buttons
- Progress bar across wizard steps
- No sidebar or admin chrome during onboarding

## Success Criteria

1. Incomplete patients cannot access dashboard or other routes
2. Complete patients enter normal app shell
3. All 10 journey steps supported with audit timestamps
4. UI build and unit tests pass

## Plan

See [plan.md](./plan.md) for implementation details.
