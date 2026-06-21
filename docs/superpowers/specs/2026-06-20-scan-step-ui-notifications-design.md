# Scan Step UI Alignment & Notification Design

**Date:** 2026-06-20  
**Route:** `/org/:city/admin/orders/:id?step=scan`  
**Status:** Approved — implemented 2026-06-20

## Goal

Align the admin **scan** step with the business flow:

1. Patient details (operator view)
2. Home visit schedule (patient preference + ops slot/technician confirm)
3. FibroScan intake review
4. Live visit status tracker
5. Scan capture data (post-visit)

Wire **notifications** at each transition so ops/superadmin see in-app alerts (and SMS where specified), and patients receive SMS + in-app when technician is assigned.

---

## Current state (as of 2026-06-20)

### UI — `OrderScanReviewPanel`

| # | Section | Current order | Target order |
|---|---------|---------------|--------------|
| 1 | `OrderPatientIntakePanel` | 1st | 1st ✓ |
| 2 | `OrderFibroScanIntakePanel` | 2nd | **3rd** |
| 3 | `OrderScanScheduleSection` | 3rd | **2nd** |
| 4 | Visit status card | 4th | 4th ✓ |
| 5 | Fibrosis scan data card | 5th | 5th ✓ |

**Gap:** Schedule is below FibroScan intake; ops must scroll past machine intake before confirming slot + technician.

### APIs (scan booking — implemented)

| Action | Endpoint | Status |
|--------|----------|--------|
| Patient preferred slot | `POST /patient-portal/orders/{id}/scan-date` | ✅ timeline only |
| Public slot cards | `GET /public/slots/scan` | ✅ |
| Ops slot cards | `GET /admin/orders/{id}/scan-slots` | ✅ |
| Available tech for slot | `GET /admin/technicians/available-for-slot` | ✅ |
| Atomic confirm | `POST /admin/orders/{id}/confirm-scan-schedule` | ✅ |
| Technician visit steps | `POST /technician/orders/{id}/visit-started`, `/reached`, `/complete` | ✅ timeline only |

### Notifications — gaps vs spec `13-notification-triggers.md`

| Event | Spec expectation | Current behavior |
|-------|------------------|------------------|
| Patient submits preferred slot | Ops notified to assign/confirm | ❌ No `WorkflowNotificationService` call |
| Ops confirms schedule + tech | Patient SMS + in-app; Tech in-app | ⚠️ `scan_scheduled` fired; `technician_assigned` bundled in confirm but may not notify tech separately |
| Tech starts visit (`visit_started`) | Ops in-app (`scan_started`) | ❌ Timeline only |
| Tech reaches location | Ops in-app | ❌ Not in trigger table; not dispatched |
| Tech completes scan | Ops + Patient | ⚠️ `scan_completed` in trigger map but verify technician service calls it |
| All events | Visible in admin Notifications + notification logs | ⚠️ Depends on `NotificationDispatchService` + Twilio templates |

---

## Recommended approach

**Approach A (recommended): Event-driven notifications via existing `WorkflowNotificationService`**

- Add trigger actions: `scan_date_requested`, `scan_schedule_confirmed`, `visit_started`, `visit_reached`, `visit_completed`
- Call `WorkflowNotificationService.order_event()` from `patient_portal_service`, `order_service`, `technician_order_service`
- Map recipients in `TRIGGER_CHANNELS` + `ROLE_TARGETS` per `13-notification-triggers.md`
- SMS via existing Twilio integration (`TwilioSmsService` + message templates)
- UI: reorder panels only; no new routes

**Approach B: Polling-only UI badges**

- Show timeline events in scan step without pushing notifications
- **Rejected:** User explicitly wants ops bell + SMS + notification logs

**Approach C: Realtime WebSocket only**

- Push via `ws:operations:orders:{id}` without inbox persistence
- **Rejected:** User wants notification section/logs for audit

---

## UI design

### Scan step section order

```
┌─────────────────────────────────────┐
│ 1. Patient details (operator)       │  OrderPatientIntakePanel
├─────────────────────────────────────┤
│ 2. Home visit schedule              │  OrderScanScheduleSection
│    - Patient preference banner      │  (read-only if patient submitted)
│    - Date + 45-min slots (API)      │
│    - Available technician cards     │
│    - Confirm home visit             │
├─────────────────────────────────────┤
│ 3. FibroScan intake review          │  OrderFibroScanIntakePanel
├─────────────────────────────────────┤
│ 4. Visit status tracker             │  Enhanced card (stepper UI)
├─────────────────────────────────────┤
│ 5. Fibrosis scan data               │  Post-capture review
└─────────────────────────────────────┘
```

### Visit tracker (enhancement)

Replace single-line status with horizontal stepper:

`Assigned → En route → At location → Scan in progress → Completed`

Data source: `GET /technician/orders/{id}/visit` (existing).

### Patient portal (unchanged layout)

Patient continues to use `PatientScanScheduleSection` on order detail; after pay, `?focus=scan-schedule` scroll.

---

## Notification design

### New / updated trigger actions

| Trigger | When | Recipients | Channels |
|---------|------|------------|----------|
| `scan_date_requested` | Patient `POST scan-date` | Ops, Super Admin | in-app |
| `scan_schedule_confirmed` | Ops `POST confirm-scan-schedule` | Patient, Technician | in-app, SMS |
| `visit_started` | Tech `POST visit-started` | Ops, Super Admin | in-app |
| `visit_reached` | Tech `POST reached` | Ops, Super Admin | in-app |
| `scan_completed` | Tech `POST complete` | Ops, Patient | in-app, SMS |

Update `specs/features/13-notification-triggers.md` to include `scan_date_requested`, `visit_reached`, align `scan_schedule_confirmed` with atomic confirm.

### Twilio SMS templates (seed)

| Template code | Used for |
|---------------|----------|
| `scan_date_requested_ops` | (optional) ops SMS — v1 in-app only |
| `scan_confirmed_patient` | Patient: visit confirmed + technician name |
| `technician_visit_assigned` | Technician: new home visit assigned |
| `scan_completed_patient` | Patient: scan done, report pending |

Templates editable in Admin → Integrations → Twilio (existing `AdminTwilioConfigPage`).

### API call sites

| Service method | Add notification |
|----------------|------------------|
| `PatientPortalService.request_scan_date` | `scan_date_requested` → ops roles |
| `OrderService.confirm_scan_schedule` | `scan_schedule_confirmed` → patient + tech |
| `TechnicianOrderService.mark_visit_started` | `visit_started` → ops |
| `TechnicianOrderService.mark_reached` | `visit_reached` → ops |
| `TechnicianOrderService.complete_visit` | `scan_completed` → ops + patient |

---

## Verification checklist (spec-based)

```
Step: scan (UI)
  Panel order: patient → schedule → fibro intake → visit → scan data
  Test: manual on /org/kolkata/admin/orders/{id}?step=scan

Step: scan (notifications)
  APIs: scan-date, confirm-scan-schedule, visit-started, reached, complete
  DB: inbox_notifications, notification_dispatch_log, message_templates
  Test: integration test_scan_notifications.py

Step: scan (Twilio)
  Admin templates active; dummy mode logs to notification logs when Twilio off
```

---

## Implementation phases (for writing-plans)

1. **Spec** — Update `03-orders-workflow.md`, `13-notification-triggers.md` with panel order + triggers
2. **UI** — Reorder `OrderScanReviewPanel`; enhance visit stepper card
3. **API notifications** — Wire `WorkflowNotificationService` at 5 call sites
4. **Templates** — Seed Twilio SMS templates migration
5. **Tests** — Integration tests for notification dispatch + existing scan booking tests
6. **Manual QA** — Order `dc1faeec-...` flow: patient pref → ops confirm → tech visit → bell + logs

---

## Out of scope (this spec)

- Real-time map / GPS tracking for technician
- Patient choosing technician (ops-only per prior decision)
- Rescheduling / unable-to-complete notification automation (follow-up spec)
