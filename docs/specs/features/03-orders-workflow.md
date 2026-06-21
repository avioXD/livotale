# Spec: Order Management & Workflow Engine

**Module**: Service orders, package-based status machine  
**Roles**: Admin, Operations (full); Technician/Doctor (assigned slice); Patient (own)

## Order fields

`order_id`, `patient_id`, `enquiry_id`, `package_id`, `package_name`, `package_price`, `discount`, `final_amount`, `payment_mode`, `payment_status`, `order_status`, `technician_id`, `partner_lab_id`, `doctor_id`, `scan_scheduled_at`, `consultation_scheduled_at`, `created_by`, `created_at`, `updated_at`

## Order statuses (full list)

`draft`, `created`, `payment_pending`, `payment_completed`, `technician_assigned`, `scan_scheduled`, `scan_in_progress`, `scan_completed`, `pathology_pending`, `lab_report_uploaded`, `ai_extraction_pending`, `ai_extraction_completed`, `report_review_pending`, `final_report_generated`, `doctor_assignment_pending`, `doctor_assigned`, `consultation_pending`, `prescription_pending`, `prescription_generated`, `completed`, `cancelled`

## Package workflow rules

### PKG-1
Required: fibrosis scan → final scan report  
Skip: pathology, doctor, prescription

### PKG-2
Required: fibrosis scan → pathology upload → AI extract → combined final report  
Skip: doctor, prescription

### PKG-3
Required: full pipeline including doctor assign → consultation → prescription publish

## Workflow service

`OrderWorkflowService.transition(orderId, event, actor)` validates:
- Current status allows event
- Package flags (pathology/consultation required)
- Payment gate before technician assign (configurable)

## Business rules

1. Patient account auto-created on order create (phone = login identity)
2. Reports hidden from patient until `published`
3. Prescription hidden until doctor `published`
4. Scan/lab data locked after final report publish (admin override only)

## Scan booking model (home FibroScan visit)

After payment, the scan step uses **patient preference → ops atomic confirm**:

| Actor | Action | API | Order fields |
|-------|--------|-----|--------------|
| Patient | Submit preferred date + 45-min slot | `POST /patient-portal/orders/{id}/scan-date` | `scan_patient_preferred_at`, `scan_time_slot` (no status change) |
| Patient | View slot cards | `GET /public/slots/scan?date=` | — |
| Operations / Super Admin | View slots + patient preference | `GET /admin/orders/{id}/scan-slots?date=` | — |
| Operations / Super Admin | List technicians free for slot | `GET /admin/technicians/available-for-slot` | — |
| Operations / Super Admin | Confirm slot + assign technician (one step) | `POST /admin/orders/{id}/confirm-scan-schedule` | `technician_id`, `scan_scheduled_at`, `scan_time_slot` → `scan_scheduled` |

Slot rules: org operating hours from `operations.org_operating_hours` (default Mon–Sat 08:00–18:00, 45-min cards). See [22-org-operating-hours.md](./22-org-operating-hours.md).

Legacy endpoints `assign-technician` and `schedule-scan` remain for reassignment after confirm.

## Consult booking model (PKG-3 teleconsult)

After the letterhead report is ready, the consultation step uses **patient preference → ops atomic confirm** (mirrors scan):

| Actor | Action | API | Order fields |
|-------|--------|-----|--------------|
| Patient | Submit preferred tele slot | `POST /patient-portal/orders/{id}/consult-date` | `consultation_patient_preferred_at`, `consultation_time_slot` (no status change) |
| Patient | View slot cards | `GET /public/slots/consult?date=` | — |
| Operations / Super Admin | View slots + patient preference | `GET /admin/orders/{id}/consult-slots?date=` | — |
| Operations / Super Admin | List doctors free for slot | `GET /admin/doctors/available-for-slot?scheduledAt=&language=` | — |
| Operations / Super Admin | Confirm slot + assign doctor (one step) | `POST /admin/orders/{id}/confirm-consultation-schedule` | `doctor_id`, `consultation_scheduled_at`, `consultation_time_slot` → `consultation_pending` |

Slot rules: aggregate tele slots from `operations.doctor_availability` / `operations.appointment_slots` across active doctors. Occupancy includes confirmed PKG-3 `consultation_scheduled_at` per doctor.

Legacy endpoints `assign-doctor` and `schedule-consultation` remain for reassignment after confirm.

Doctors **cannot** schedule consult times (`POST /doctor/consultations/{id}/schedule` → 403).

### Consult step verification checklist

```
Step: consultation
  UI: patient preference banner → slot picker → doctor picker → confirm
  APIs: GET public/consult-slots, GET consult-slots, GET available-for-slot,
        POST consult-date, POST confirm-consultation-schedule
  DB: service_orders, order_consultations, doctor_availability, appointment_slots
  Test: test_consult_booking_patient_pref_ops_confirm.py, test_consult_notifications.py
```

### Scan step panel order (`OrderScanReviewPanel`)

Admin scan step (`?step=scan`) renders sections in this order:

1. **Patient details** — `OrderPatientIntakePanel` (ops may optionally pre-fill; no approve/reject gate)
2. **Home visit schedule** — `OrderScanScheduleSection` (patient preference + ops slot/technician confirm)
3. **FibroScan intake review** — `OrderFibroScanIntakePanel`
4. **Visit status tracker** — `OrderVisitTrackerCard` (horizontal stepper)
5. **Fibrosis scan data** — post-capture review card

### Patient intake (scan step)

| Actor | Action | Notes |
|-------|--------|-------|
| Operations | Optionally save patient details | Name, sex, age, phone, weight, height, comorbidities (BP, diabetes, thyroid) |
| Technician | View after payment | Pre-filled from ops save or order defaults; not blocked if ops has not saved |
| Technician | Verify at home visit | Phone OTP required at `reached_location`; auto-completes intake (no ops approval) |

Legacy `operator_verify_intake` API is deprecated; UI does not expose validate/reject for **patient** intake.

### FibroScan intake (scan step)

| Actor | Action | API | Notes |
|-------|--------|-----|-------|
| Technician | Submit device code + machine demographics | `POST /technician/orders/{id}/fibroscan-intake` | Requires patient OTP verify first |
| Operations | Approve or reject technician submission | `PATCH /admin/orders/{id}/fibroscan-intake/verify` | Requires `fibroscanIntakeSubmittedAt`; sets `fibroscan_intake_verified` on approve |
| Technician | Resubmit after rejection | `POST .../fibroscan-intake` | Resets ops status to `pending` |

Timeline events: `fibroscan_intake_submitted`, `fibroscan_intake_approved`, `fibroscan_intake_rejected`.

### Scan step verification checklist

```
Step: scan
  UI: panel order patient → schedule → fibro intake → visit → scan data
  APIs: GET scan-slots, GET available-for-slot, POST confirm-scan-schedule, POST scan-date,
        POST fibroscan-intake, PATCH fibroscan-intake/verify, GET patient-intake
  DB: scan_patient_intake, service_orders, order_timeline_events, technicians, org_operating_hours
  Test: test_fibroscan_intake.py, test_scan_booking_patient_pref_ops_confirm.py, test_scan_notifications.py
```

---

## Ops order detail UI — step workflow (not tabs)

**Route:** `/admin/orders/:id?step={stepId}`  
**Legacy:** `?tab=` and old step IDs map to `?step=` (`pathology`, `lab-report`, `ai` → `lab`)

### Business steps (package-pruned)

| Step ID | Label | PKG-1 | PKG-2 | PKG-3 | Owner |
|---------|-------|-------|-------|-------|-------|
| `payment` | Order & payment | ✓ | ✓ | ✓ | Operations |
| `scan` | Fibrosis scan | ✓ | ✓ | ✓ | Technician (ops assigns) |
| `lab` | Lab report (incl. letterhead PDF) | — | ✓ | ✓ | Operations |
| `report` | Letterhead report | ✓ | — | — | Operations |
| `consultation` | Consultation & Rx | — | — | ✓ | Doctor |
| `complete` | Complete | ✓ | ✓ | ✓ | Operations |

Logic: `orderBusinessSteps.ts` — steps derived from package flags:
- `fibrosisScanIncluded` → **Scan** step
- `pathologyIncluded` → **Lab report** step (partner lab, sample dispatch, PDF upload, AI extraction, letterhead PDF)
- Scan-only packages (PKG-1) → separate **Letterhead report** step after scan
- `consultationIncluded` → **Consultation & Rx** step
- Payment, letterhead report, and complete → all packages

`getPackageWorkflowSummary()` drives the hint line above the stepper (e.g. PKG-3 · 5 steps · includes pathology & doctor consult).

### Step lock rules

| UI state | Meaning | User can open? | Panel |
|----------|---------|----------------|-------|
| **completed** | Step finished | Yes — **read-only full data** | Same step panels with `readOnly`; downloads enabled |
| **active** | Current work step | Yes — **editable** | Full step panel + advance actions |
| **upcoming** | Not started | **No** (locked in stepper) | Blocked message if URL forced |

- On open (no `?step=`): auto-navigate to **active** step.
- Completed steps show full step data (payment records, scan values, lab PDF, AI parameters table, letterhead download) but **no edit actions**.
- Download / view links (invoice PDF, lab PDF, letterhead PDF, preview) remain available on completed steps.
- Future steps show lock icon; not clickable.

### Step content

| Step | Work panel |
|------|------------|
| `payment` | `OrderPaymentSection` |
| `scan` | `OrderScanReviewPanel` |
| `lab` | `OrderPathologySection` — partner lab, dispatch, PDF upload, AI review, `FinalReportSection` letterhead PDF |
| `report` | `FinalReportSection` — PKG-1 scan-only letterhead PDF |
| `consultation` | Doctor assign with 2-week availability calendar, teleconsult slot booking, Rx (PKG-3) |
| `complete` | Completion message |

**Activity log** — clock icon button in order header (badge = event count). Opens right **sidebar** with merged workflow timeline + audit log entries for this order. Each entry shows category (Payment, Scan, Pathology, AI, etc.), title, detail line, metadata chips, performer, and full timestamp. Grouped by date. Not a workflow step.

**Advance workflow** — dev-only (`import.meta.env.DEV`). Shortcut buttons on the **active** step to simulate status transitions locally; hidden in production builds. Ops advance orders through each step panel (payment, scan, lab, etc.).

### Role lenses (future / parallel routes)

| Role | Route | Steps |
|------|-------|-------|
| Operations | `/admin/orders/:id` | All (per package) |
| Technician | `/technician/orders/:id` | Scan (+ sample handoff) |
| Doctor | Consultations hub | Consultation only |
| Patient | `/patient/orders/:id` | Read-only milestones |

### List page

- Ops hub **Orders & payments** (`/admin/operations?tab=orders`)
- Filters: payment, workflow stage, created by, assigned to (URL-synced)
- Back arrow: `navigate(-1)`, fallback to orders list

## Code map

| File | Purpose |
|------|---------|
| `orderBusinessSteps.ts` | Step definitions, active step, lock state |
| `OrderWorkflowStepper.tsx` | Horizontal pipeline UI |
| `OrderActivityLogSidebar.tsx` | Header activity icon → audit/timeline sidebar |
| `OrderPackageWorkflowHint.tsx` | Package-derived step count & path |
| `ReadOnlyStepNotice.tsx` | Banner on completed steps |
| `OrderStepLockedSummary.tsx` | Blocked upcoming steps only |
| Step panels (`readOnly` prop) | Full data view when step completed |
| `LiverCareOrderDetailPage.tsx` | Step shell + activity log |

## Realign

- `009` Orders & payments tab → bind to `service_orders`
- Create order from enquiry CRM only (no book-appointment CTA)
