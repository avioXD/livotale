# Implementation Plan: RBAC Appointment Scheduling

**Branch**: `007-rbac-appointment-scheduling` | **Date**: 2026-06-06 | **Spec**: [spec.md](./spec.md)

## Summary

Introduce a **unified appointment domain** (`operations.appointments`) with full RBAC, status machine, slot engine, and role-specific UIs — migrating the existing 005 home-visit MVP without breaking onboarding (`visit_booked` journey gate).

Delivery is **6 phases** over incremental PRs; each phase is independently testable and deployable.

## Technical Context

| Item | Choice |
|------|--------|
| Backend | Node.js API in `livotale_app/api` (existing Fastify-style routes) |
| Database | PostgreSQL migrations `019`–`022` in `livotale_app/database/migrations` |
| Frontend | React 19 + Vite in `livotel-ui`; Zustand stores + class services |
| Auth/RBAC | Extend 003 permissions; middleware in route registrars |
| PDF | Server-side generation (pdfkit or existing storage pipeline) + QR |
| Notifications | Extend `core.notifications` + `appointment_reminder_logs` |
| Geo | REST ping endpoint; map via admin/patient polling (30s) v1 |
| Timezone | UTC storage; `Asia/Kolkata` display via `utils/date` |

## Constitution Check

| Gate | Status |
|------|--------|
| Spec before code | PASS — this spec package |
| Pages → store → service → API | PASS — planned per role modules |
| API contract fidelity | PASS — [contracts/appointment-scheduling-api.md](./contracts/appointment-scheduling-api.md) |
| RBAC tests for new permissions | REQUIRED in Phase 1 |
| pnpm test/build/snyk before merge | REQUIRED each phase |
| Smallest diff / reuse | PASS — extend home_visits, prescriptions, consultations |

## Project Structure

### Documentation

```text
specs/007-rbac-appointment-scheduling/
├── spec.md
├── plan.md
├── tasks.md
├── data-model.md
└── contracts/appointment-scheduling-api.md
```

### Backend (`livotale_app/api`)

```text
src/
├── services/
│   ├── appointmentSchedulingService.js   # unified CRUD + status machine
│   ├── appointmentSlotService.js         # availability + slot generation
│   ├── appointmentNotificationService.js
│   ├── appointmentTeleService.js
│   ├── appointmentPrescriptionService.js  # wraps existing prescription logic
│   └── appointmentMigrationAdapter.js    # 005 legacy bridge
├── routes/
│   ├── patientAppointments.js
│   ├── doctorAppointments.js
│   ├── technicianAppointments.js
│   ├── careAppointments.js
│   └── adminAppointments.js
└── jobs/
    ├── appointmentReminders.js
    └── appointmentMissedDetector.js
```

### Frontend (`livotel-ui`)

```text
src/
├── types/appointments.ts                 # extend existing
├── services/appointments/                # split by actor sub-services
├── store/appointments/                   # patient + role stores
├── rbac/permissions/appointment.ts
└── app/pages/
    ├── appointments/                     # patient (extend 005)
    ├── doctor/appointments/
    ├── technician/schedule/
    └── admin/appointments/
```

## Phase Breakdown

### Phase 0 — Foundation (blocking)

- Migrations: `appointment_types`, `appointments`, `appointment_status_history`
- Seed 10 appointment types
- Backfill from `home_visits`
- Permission seeds + middleware helpers
- `appointmentSchedulingService` status transition validator
- Legacy adapter for 005 routes
- Types + base `AppointmentsService` refactor

**Exit**: Existing patient home visit flow works through unified table; build green.

### Phase 1 — Patient booking wizard (P1 US1–US2)

- Slot service v1 (fixed slots → doctor availability in Phase 2)
- Multi-type booking wizard UI (stepper)
- Reschedule/cancel with policy checks
- Timeline component on detail page
- Payment status stub

**Exit**: Patient books clinic + home + tele types; reschedule/cancel with audit.

### Phase 2 — Doctor calendar & consultation (P1 US3)

- Doctor availability CRUD + slot generation job
- Calendar views (day/week/month/list)
- Consultation start/complete/no-show
- Link to prescription builder (existing fields + appointment context)
- Internal notes

**Exit**: Doctor manages calendar; completes consultation without double-book.

### Phase 3 — Technician field ops (P1 US4)

- Schedule + route order UI
- Geo ping API + patient tracking view
- Vitals/Liver Fibrosis Scan/sample flows wired to appointment_id
- Failed visit + escalation

**Exit**: End-to-end home visit on unified appointment.

### Phase 4 — Prescription, signature, PDF (P1 US3 cont.)

- Prescription panel extensions (medicines, supplements, advice blocks)
- AI draft vs doctor-final versioning (008)
- Signature upload + approve gate
- Auto PDF + QR + patient download

**Exit**: Approved Rx PDF visible to patient; draft hidden.

### Phase 5 — Admin, notifications, tele (P2 US5–US7)

- Admin dashboard + assignment + override
- Holiday management
- Reminder job (24h/2h/15m)
- Notification logs
- Teleconsultation join window enforcement

**Exit**: Admin can operate clinic day; reminders fire in dev log.

### Phase 6 — Dietician, analytics, polish (P2–P3 US6–US8)

- Care role appointment views
- Analytics endpoints + admin charts
- Missed appointment admin workflow
- Deprecate legacy 005-only code paths

**Exit**: Full spec success criteria met.

## Status State Machine

Implement as centralized `transitionAppointmentStatus(appointmentId, toStatus, context)`:

- Validates allowed edges per appointment type
- Writes history + patient timeline + audit log
- Emits notification intents (async)

Core happy-path edges (simplified):

```text
draft → pending_payment → booked → confirmed
booked → doctor_assigned → technician_assigned (as needed)
→ reminder_sent → patient_confirmed
→ technician_on_the_way → technician_arrived → sample_collected
→ report_uploaded → waiting_for_doctor → consultation_started
→ prescription_drafted → prescription_approved → completed → closed
```

Cancel/reschedule/no-show edges from most pre-completion states (policy-gated).

## Risk & Mitigations

| Risk | Mitigation |
|------|------------|
| Scope too large for one PR | Strict phased delivery per tasks.md |
| Breaking onboarding home visit | Migration adapter + journey stamp unchanged |
| Double-booking race | DB unique constraint + transaction slot lock |
| Large bundle (calendar UI) | Lazy-load doctor/admin routes |

## Complexity Tracking

| Decision | Why | Alternative rejected |
|----------|-----|---------------------|
| Unified `appointments` table | Single lifecycle for 10 types | Separate table per type — duplicated logic |
| Phased slot engine | Ship booking before full calendar | Big-bang calendar — delays patient MVP |
| Polling for geo v1 | No WebSocket infra yet | Socket server — out of scope |

## References

- Existing: `006_home_visits`, `008` prescriptions, `010` consultations, `018` status events
- RBAC: `003-rbac-auth-module`
- Prior MVP: `005-appointments-module`
