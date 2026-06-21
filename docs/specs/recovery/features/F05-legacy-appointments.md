# F05 — Legacy Appointments Module Decision

**Priority**: P1 (largest API gap)  
**Gap**: G-11 — **~40 UI endpoints with zero FastAPI routes**

---

## Problem statement

The UI still calls a full appointment scheduling domain:

```
/admin/appointments/*
/patient/appointments/*
/doctor/appointments/*
/technician/schedule, /technician/routes/*
/admin/analytics/org/appointments
/admin/appointment-reminder-logs
```

FastAPI has **no** appointments router. Implementation exists only in legacy Node:

- `apps/api/src/routes/admin.js`
- `apps/api/src/routes/patient.js`
- Related services under `api/src/services/`

Meanwhile **Liver Care orders** (`service_orders`) are the primary workflow per `PLAN.md` Phase B–D.

---

## Decision matrix (pick one)

| Option | Description | Effort | UI impact |
|--------|-------------|--------|-----------|
| **A — Retire UI** | Remove/hide appointment routes; redirect to orders | 3–5 days | Break users expecting appointments |
| **B — Port to FastAPI** | Migrate Node appointments module to Python | 3–4 weeks | Full feature restored |
| **C — Hybrid** | Keep teleconsult for PKG-3 via order consultations; retire rest | 1 week | Surgical |

**Recommendation**: **Option C (Hybrid)** aligned with PLAN.md "appointment-first ops deprecated".

---

## Decision (2026-06-20)

**Approved: Option A — Retire legacy appointment UI**

Stakeholder chose Option A via recovery Phase H kickoff. Service orders (`service_orders`) are the sole scheduling model. Legacy appointment routes redirect to patient portal, admin operations hub, or doctor consultations. FastAPI appointment routers are **not** being ported in this phase.

### Implemented actions

| Area | Action |
|------|--------|
| Patient `/appointments/*` | Redirect → `/patient` |
| Admin `/admin/appointments/*` | Redirect → operations hub / dashboard |
| Doctor `/doctor/appointments/*` | Redirect → `/doctor/consultations` |
| `AdminOperationsHubPage` | Removed broken `GET /admin/appointments/dashboard` call |
| `DoctorDashboardPanel` | Uses `doctorConsultationService.listAssignedOrders` instead of appointment APIs |

### Deferred (Option C items — revisit only if tele UX gaps appear)

- Dedicated tele-join page wired to `GET /doctor/consultations/{id}/tele-join`
- Admin notification log API (`operations.appointment_reminder_logs`)

---

## Option C — Hybrid spec

### Keep (wire to existing FastAPI)

| UI need | Replace with |
|---------|--------------|
| Doctor calendar | `GET /doctor/consultations/orders` + schedule on order |
| Tele join | `GET /doctor/consultations/{id}/tele-join` |
| Admin consult queue | `GET /admin/consultations/queue` |

### Remove or placeholder

| UI route | Action |
|----------|--------|
| `/org/:city/appointments` (patient) | Redirect to patient portal orders |
| `/admin/appointments/*` | Remove tabs from ops hub; link to consultations queue |
| `/admin/appointments/analytics` | Use `/admin/sample-collections/analytics` only |
| `RouteMonitoringPage`, `MissedAppointmentsPage` | Delete or archive |
| `AdminBookAppointmentPage` | Already superseded by order create — rename per TASKS O107 |

### Port later (if stakeholder requires)

| Endpoint | Migration source |
|----------|----------------|
| Walk-in book | New `POST /admin/orders` with walk-in flag |
| Reminder logs | `operations.appointment_reminder_logs` (migration 024) |

---

## If Option B chosen — port checklist

1. Inventory Node routes → OpenAPI diff
2. Create `app/api/v1/routers/admin/appointments.py`
3. Map to `operations.appointments` tables (migrations 018–021)
4. Port services: booking, availability, reminders, route-live
5. Contract tests from `specs/contracts/appointment-scheduling-api.md`
6. Update `20-api-integration-matrix.md`

---

## Edge cases (if porting)

| # | Scenario |
|---|----------|
| E1 | Double-book doctor slot |
| E2 | Reschedule inside cancellation window |
| E3 | Missed appointment → notification |
| E4 | Route request approve/reject |
| E5 | Tele session without appointment link to order |

---

## Stakeholder question (blocking)

> Confirm: Are **service orders** the sole scheduling model going forward, with teleconsult only for PKG-3?

**Answer (2026-06-20)**: Yes — service orders only. Legacy appointment UI retired (Option A). Teleconsult flows use order consultations (`/doctor/consultations/*`).

---

## Tests (Option C)

- E2E: no UI route calls `/admin/appointments/*` (grep CI check)
- Contract: consultations queue + tele-join work
- Playwright: admin ops hub loads without appointment 404s
