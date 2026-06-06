# Feature Specification: RBAC Appointment Scheduling System

**Feature Branch**: `007-rbac-appointment-scheduling` | **Created**: 2026-06-06 | **Status**: Approved (Phase 0 in progress)

**Product**: LIVGASTRO Smart Liver Clinic (Livotel)

**Supersedes / extends**: [005-appointments-module](../005-appointments-module/spec.md) (home-visit MVP). Existing `operations.home_visits` and patient booking UI remain supported during migration.

## Objective

Deliver a **role-based, end-to-end appointment lifecycle** for the liver clinic: booking → assignment → field/tele visit → consultation → prescription → PDF → timeline — with strict RBAC, audit, reminders, and admin control.

Each role (Patient, Doctor, Technician, Dietician/Health Coach, Admin/Operations) sees **only permitted data and actions**.

## Scope Boundaries

| In scope (this feature) | Out of scope (separate specs / later) |
|-------------------------|----------------------------------------|
| All appointment types listed below | Full payment gateway integration (stub payment status OK) |
| Status machine + timeline + audit | WhatsApp Business API production credentials |
| Doctor availability & slot engine | Real-time video provider beyond secure link + join audit |
| Technician route order + geo pings | Turn-by-turn navigation SDK (deep link to maps OK) |
| Notification + reminder **queue & logs** | Third-party SMS provider production setup |
| Prescription builder tied to appointment | New AI prescription engine (reuse 008 tables) |
| Auto PDF generation hook | Pharmacy order fulfillment |
| Admin dashboard + analytics v1 | City-manager territory rules beyond city_id filter |

## User Scenarios & Testing

### US1 — Patient books any allowed appointment type (Priority: P1)

Patient selects appointment type → date → slot → visit mode (home/clinic/online) → reason/symptoms → optional report uploads → address (if home) → payment if required → receives confirmation.

**Why P1**: Core revenue and care entry point.

**Independent Test**: Patient completes clinic FibroScan booking; appointment appears in list with `booked` status and timeline entry.

**Acceptance Scenarios**:

1. **Given** available slots for selected doctor/date, **When** patient submits booking, **Then** appointment is created with unique ID, timeline event `appointment_booked`, and patient sees confirmation.
2. **Given** home visit type, **When** patient books without address, **Then** validation error and no appointment created.
3. **Given** paid appointment type, **When** payment not completed, **Then** status remains `pending_payment` until payment recorded.

---

### US2 — Patient manages own appointments (Priority: P1)

Patient views list/detail, reschedules within policy, cancels with reason, joins teleconsultation in allowed window, tracks technician for home visit, downloads approved prescription PDF.

**Independent Test**: Patient reschedules a `booked` appointment; doctor and timeline reflect change; old slot freed.

**Acceptance Scenarios**:

1. **Given** appointment within reschedule window, **When** patient picks new slot, **Then** status `rescheduled`, reschedule count incremented, notifications queued.
2. **Given** appointment past cancellation cutoff, **When** patient attempts cancel, **Then** blocked unless admin override flag.
3. **Given** approved prescription PDF exists, **When** patient downloads, **Then** PDF URL served; draft prescriptions not accessible.

---

### US3 — Doctor calendar, consultation, prescription (Priority: P1)

Doctor sets weekly/date availability, blocks slots, adds leave; views day/week/month calendar; starts consultation; edits AI draft; approves with mandatory signature; PDF auto-generated; marks completed or no-show.

**Independent Test**: Doctor approves prescription for assigned appointment; patient receives notification; PDF stored and visible.

**Acceptance Scenarios**:

1. **Given** doctor availability Mon–Fri 10:00–14:00, **When** slots generated, **Then** no double-booking for same doctor/time.
2. **Given** AI draft prescription linked to appointment, **When** doctor edits and approves with signature, **Then** `prescription_approved` status, PDF generated, audit log entries for each edit.
3. **Given** patient no-show, **When** doctor marks no-show with reason, **Then** status `no_show`, missed workflow triggered.

---

### US4 — Technician field workflow (Priority: P1)

Technician views daily schedule and route order; starts journey; geo updates; marks arrived; captures consent/vitals/FibroScan/sample; completes visit or escalates.

**Independent Test**: Technician completes home visit checklist; appointment moves to `report_pending` / `completed` per type rules.

**Acceptance Scenarios**:

1. **Given** assigned home visits, **When** technician opens route, **Then** stops ordered by admin optimizer or scheduled time.
2. **Given** visit in progress, **When** vitals saved, **Then** BMI auto-calculated from height/weight.
3. **Given** patient unavailable, **When** technician marks failed visit with reason, **Then** escalation task created for admin.

---

### US5 — Admin operations & assignment (Priority: P2)

Admin views all appointments; creates on behalf of patient; assigns/reassigns doctor and technician; overrides status; manages types, holidays, policies; triggers reminders; handles missed cases.

**Independent Test**: Admin reassigns technician for home visit; patient and technician notifications sent.

---

### US6 — Dietician / Health Coach sessions (Priority: P2)

Dietician or health coach views assigned session appointments; adds session notes; recommends follow-up; cannot access unrelated patient records.

---

### US7 — Notifications, reminders, teleconsultation (Priority: P2)

System sends configurable reminders (24h, 2h, 15m); teleconsultation link active only in join window; join events audited.

---

### US8 — Analytics & reporting (Priority: P3)

Admin views appointment volume, completion/cancel/miss rates, revenue summary, doctor/technician utilization.

### Edge Cases

- Booking attempted in past slot → rejected.
- Doctor double-booked across clinic + tele → rejected.
- Technician overlapping home visits → rejected on assign.
- Teleconsultation link accessed 2 hours before window → denied.
- Prescription edited after approval → PDF must regenerate; old PDF marked superseded.
- Geo tracking stops after visit `completed` (privacy).
- Emergency appointment bypasses normal slot rules with admin audit flag.
- Migration: legacy `home_visits` rows appear in unified appointment list.

## Functional Requirements

### Appointment types (configurable)

System MUST support these types (admin-configurable duration, price, staff rules, policies):

1. Home Visit  
2. Clinic Visit  
3. Teleconsultation  
4. Doctor Consultation  
5. FibroScan Appointment  
6. Blood Sample Collection  
7. Dietician Consultation  
8. Health Coach Follow-up  
9. Package Follow-up Visit  
10. Emergency/Priority Visit  

Each type MUST configure: duration, price, required staff (doctor/technician/equipment), home/tele allowed flags, cancellation window, reschedule window, reminder schedule, default follow-up interval.

### Status lifecycle

Appointments MUST use auditable statuses including (minimum set):

`draft`, `pending_payment`, `booked`, `confirmed`, `doctor_assigned`, `technician_assigned`, `reminder_sent`, `patient_confirmed`, `technician_on_the_way`, `technician_arrived`, `sample_collected`, `report_pending`, `report_uploaded`, `waiting_for_doctor`, `consultation_started`, `prescription_drafted`, `prescription_approved`, `completed`, `rescheduled`, `cancelled_by_patient`, `cancelled_by_admin`, `cancelled_by_doctor`, `no_show`, `missed`, `follow_up_required`, `closed`.

Every transition MUST append to `appointment_status_history` with: status, changed_by, role, timestamp, reason, notes, system_generated flag.

### RBAC (extends 003-rbac-auth-module)

| Role | Access |
|------|--------|
| Patient | Own appointments, own prescriptions after approval, own timeline |
| Doctor | Assigned appointments + assigned patients only |
| Technician | Assigned visits only |
| Dietician / Health Coach | Assigned session appointments only |
| Admin / Operations / Super Admin | All appointments; override actions audited |

Permissions MUST be enforced in API middleware and UI route guards.

### Flows

- **Booking**: 15-step patient flow per requirements (type → date → slot → mode → reason → reports → address → charges → payment → create → assign → notify → timeline).
- **Reschedule**: policy check, reason required, count tracked, notifications, possible staff reassignment.
- **Cancellation**: reason required, refund eligibility flag, cancellation charge, notifications.
- **Missed / no-show**: reason required, admin task, patient reschedule offer, timeline entry.

### Doctor calendar & slots

- Weekly + date-specific availability, buffer time, max per day, slot types (tele/clinic/home review/emergency).
- Slot fields: doctor_id, date, start, end, type, status, max/current bookings, blocked flag.
- Prevent past booking and bookings beyond future window.

### Technician routes & geo

- Daily route with ordered stops, ETA, statuses: assigned → accepted → on_the_way → arrived → visit_started → sample_collected → report_uploaded → completed / failed / escalated.
- Geo: lat/lng, updated_at; patient tracking view; admin live map; privacy cutoff after completion.

### Notifications & reminders

Channels: SMS, WhatsApp, email, push, in-app (delivery via existing `core.notifications` + new delivery logs).

Events: booked, confirmed, payment, assigned, rescheduled, cancelled, on_the_way, arrived, tele link, reminders (24h/2h/15m), missed, prescription, report uploaded, follow-up due.

### Prescription & PDF (extends 008)

- Full prescription panel fields per requirements (complaints, diagnosis, medicines, supplements, advice, follow-up, tests).
- AI draft hidden from patient until doctor approval; separate AI vs doctor-final versions; edit audit.
- Signature mandatory before approval; auto PDF with Rx number + QR verification.

### Patient timeline

All appointment events MUST write to `clinical.patient_timeline_events` (existing) with appointment_id linkage.

### Validation rules (non-exhaustive)

- FR-V01: No past-slot booking.
- FR-V02: No doctor double-booking.
- FR-V03: No overlapping technician home visits.
- FR-V04: Patient cancel blocked after cutoff unless admin override.
- FR-V05: Prescription download only when `prescription_approved`.
- FR-V06: Signature required before final approval.
- FR-V07: PDF regenerates on post-approval edit.
- FR-V08: Every status change → timeline + audit.
- FR-V09: Missed/reschedule/cancel require reason.
- FR-V10: Tele link time-gated.

## Key Entities

See [data-model.md](./data-model.md). Reuses: `operations.home_visits` (legacy), `care.consultations`, `clinical.prescriptions`, `clinical.digital_signatures`, `operations.technician_routes`, `core.notifications`, `clinical.patient_timeline_events`.

New unified core: `operations.appointments`, `operations.appointment_types`, `operations.appointment_slots`, `operations.doctor_availability`, `operations.doctor_holidays`, `operations.appointment_status_history`, `operations.appointment_reschedules`, `operations.appointment_cancellations`, `operations.appointment_missed_records`, `operations.technician_geo_locations`, `operations.appointment_reminder_logs`, `operations.appointment_payments`, `operations.appointment_internal_notes`, `operations.teleconsultation_sessions`, `clinical.prescription_pdfs`.

## API Surface

Full contract: [contracts/appointment-scheduling-api.md](./contracts/appointment-scheduling-api.md)

Grouped by actor: Patient, Doctor, Technician, Dietician/Coach, Admin.

## UI Screens (by role)

**Patient**: booking wizard, detail, reschedule, cancel, tele join, prescription list/PDF, timeline, notifications.

**Doctor**: dashboard, calendar (day/week/month/list), slot & holiday management, appointment detail, patient summary, consultation panel, prescription builder, signature upload, PDF preview.

**Technician**: daily schedule, route map, visit detail, vitals, FibroScan/report upload, sample collection, completion, escalation.

**Admin**: appointment dashboard, calendar overview, assignment panels, route monitoring, missed management, notification logs, analytics, prescription templates.

Architecture: Pages → Zustand stores → services → API (constitution III).

## Success Criteria

1. Each role sees only RBAC-permitted appointments in UI and API (403 otherwise).
2. Patient can book, reschedule (within policy), and cancel all in-scope appointment types.
3. Doctor can manage availability without double-booking in concurrent test.
4. Technician can complete home visit workflow with geo + vitals + sample ID.
5. Prescription visible to patient only after doctor approval + signature; PDF auto-generated.
6. Every status change appears in appointment timeline and patient timeline.
7. Admin dashboard surfaces today's queue, unassigned staff, missed, and payment pending.
8. `pnpm build`, `pnpm test`, `pnpm snyk:test` pass after each delivery phase.
9. Legacy 005 home visit bookings remain visible through migration adapter.

## Assumptions

- Auth/RBAC from 003 is source of truth for roles and permissions.
- Timezone: store UTC (`timestamptz`); display in clinic timezone (`Asia/Kolkata` default) in UI.
- Payment: record status + amount; gateway webhook is stubbed in v1.
- SMS/WhatsApp: log outbound + simulate delivery in dev; production provider swapped later.
- Video: secure URL stored on appointment; provider-agnostic.
- Maps: external deep link (Google Maps) for technician navigation v1.
- AI prescription: reuse existing `clinical.prescriptions` + `prescription_versions`; link via `appointment_id`.

## Plan & Tasks

- Implementation plan: [plan.md](./plan.md)  
- Task breakdown: [tasks.md](./tasks.md)
