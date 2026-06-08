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
