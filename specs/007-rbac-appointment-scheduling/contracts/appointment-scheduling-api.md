# Appointment Scheduling API Contract

**Feature**: 007-rbac-appointment-scheduling  
**Base URL**: `VITE_API_BASE_URL` (default `http://localhost:4001`)  
**Envelope**: `{ data: T }` on success; `{ error: { code, message, details? } }` on failure  
**Auth**: Bearer JWT; role + permission checks on every route

## Permission codes (new)

| Code | Roles |
|------|-------|
| `appointment.book_own` | patient |
| `appointment.view_own` | patient |
| `appointment.view_assigned` | doctor, technician, dietician, health_coach |
| `appointment.view_all` | admin, support, city_manager, super_admin |
| `appointment.manage_availability` | doctor |
| `appointment.assign_staff` | admin, support |
| `appointment.override_status` | admin, super_admin |
| `appointment.manage_types` | admin, super_admin |
| `prescription.manage_assigned` | doctor |
| `prescription.view_own_approved` | patient |

---

## Shared types

```typescript
type AppointmentStatus =
  | 'draft' | 'pending_payment' | 'booked' | 'confirmed'
  | 'doctor_assigned' | 'technician_assigned' | 'reminder_sent'
  | 'patient_confirmed' | 'technician_on_the_way' | 'technician_arrived'
  | 'sample_collected' | 'report_pending' | 'report_uploaded'
  | 'waiting_for_doctor' | 'consultation_started' | 'prescription_drafted'
  | 'prescription_approved' | 'completed' | 'rescheduled'
  | 'cancelled_by_patient' | 'cancelled_by_admin' | 'cancelled_by_doctor'
  | 'no_show' | 'missed' | 'follow_up_required' | 'closed';

type VisitMode = 'home' | 'clinic' | 'tele';

interface AppointmentSummary {
  id: string;
  appointmentCode: string;
  typeCode: string;
  typeName: string;
  visitMode: VisitMode;
  status: AppointmentStatus;
  scheduledStart: string; // ISO8601
  scheduledEnd: string;
  doctorName?: string;
  technicianName?: string;
  addressSummary?: string;
  paymentStatus: string;
  canReschedule: boolean;
  canCancel: boolean;
}

interface TimelineEntry {
  id: string;
  fromStatus?: AppointmentStatus;
  toStatus: AppointmentStatus;
  title: string;
  actorRole: string;
  reason?: string;
  notes?: string;
  occurredAt: string;
  isSystemGenerated: boolean;
}

interface AppointmentDetail extends AppointmentSummary {
  chiefComplaint?: string;
  symptoms?: string;
  timeline: TimelineEntry[];
  teleconsultation?: {
    meetingUrl: string;
    joinOpensAt: string;
    joinClosesAt: string;
    canJoin: boolean;
  };
  prescriptionId?: string;
  progressSteps?: Array<{ code: string; label: string; state: string }>;
}
```

---

## Patient APIs

### GET `/patient/appointment-types`

List bookable types with modes, price, duration.

**Response**: `{ data: AppointmentType[] }`

### GET `/patient/appointments/slots`

Query: `typeCode`, `date`, `visitMode`, `doctorId?`

**Response**: `{ data: Slot[] }`

### GET `/patient/appointments/doctors`

Query: `typeCode`, `date`, `slotId?` — doctors available for selection.

### GET `/patient/appointments`

List own appointments. Query: `status?`, `from?`, `to?`

### GET `/patient/appointments/:id`

Full detail + timeline + permissions flags.

### POST `/patient/appointments`

```json
{
  "typeCode": "fibroscan",
  "visitMode": "clinic",
  "slotId": "uuid",
  "doctorId": "uuid",
  "addressId": "uuid",
  "chiefComplaint": "...",
  "symptoms": "...",
  "reportFileIds": ["uuid"],
  "paymentMethod": "online"
}
```

**Response**: `{ data: AppointmentDetail }` — status `pending_payment` or `booked`.

### PATCH `/patient/appointments/:id/reschedule`

```json
{ "slotId": "uuid", "reason": "Travel conflict" }
```

### POST `/patient/appointments/:id/cancel`

```json
{ "reasonCode": "patient_unavailable", "reasonText": "..." }
```

### POST `/patient/appointments/:id/reports`

Attach pre-visit report file IDs.

### GET `/patient/appointments/:id/teleconsultation/join`

Returns join payload if within window.

### GET `/patient/appointments/:id/technician-tracking`

Patient view of technician location (home visits only, active statuses).

### GET `/patient/appointments/:id/prescription`

Approved prescription only (403 if draft).

### GET `/patient/appointments/:id/prescription/pdf`

Download URL for approved PDF.

---

## Doctor APIs

### GET `/doctor/appointments/calendar`

Query: `view=day|week|month|list`, `date`, `status?`

### GET `/doctor/appointments`

Today's / upcoming / completed / missed filters.

### GET `/doctor/appointments/:id`

Includes patient summary, reports, FibroScan/lab snippets, internal notes.

### PUT `/doctor/availability`

Weekly rules + effective range.

### POST `/doctor/availability/exceptions`

Date-specific blocks or extra slots.

### POST `/doctor/holidays`

Leave/holiday entries for self.

### POST `/doctor/appointments/:id/block-slot`

Block specific slot with reason.

### POST `/doctor/appointments/:id/start-consultation`

Transitions → `consultation_started`.

### POST `/doctor/appointments/:id/complete`

```json
{ "summary": "...", "followUpDays": 30, "referDietician": false }
```

### POST `/doctor/appointments/:id/no-show`

```json
{ "reasonCode": "patient_not_reachable", "reasonText": "..." }
```

### POST `/doctor/appointments/:id/request-reschedule`

```json
{ "preferredSlotId": "uuid", "reason": "..." }
```

### POST `/doctor/appointments/:id/prescription`

Create/update prescription draft linked to appointment.

### POST `/doctor/appointments/:id/prescription/approve`

Requires signature on file; triggers PDF generation.

### POST `/doctor/signature`

Upload/update signature image metadata.

### GET `/doctor/appointments/:id/prescription/pdf/preview`

Preview before send.

---

## Technician APIs

### GET `/technician/schedule`

Query: `date` — daily appointments + route order.

### GET `/technician/routes/:date`

Route with stops, distances, ETAs.

### POST `/technician/appointments/:id/accept`

### POST `/technician/appointments/:id/start-journey`

### POST `/technician/geo`

```json
{ "appointmentId": "uuid", "latitude": 19.07, "longitude": 72.87, "accuracyM": 10 }
```

### POST `/technician/appointments/:id/arrived`

### POST `/technician/appointments/:id/consent`

Digital consent capture (existing consent flow).

### PUT `/technician/appointments/:id/vitals`

Height, weight, BP, pulse, SpO2, temperature, waist → BMI auto.

### POST `/technician/appointments/:id/fibroscan`

FibroScan reading + report file.

### POST `/technician/appointments/:id/sample-collected`

```json
{ "sampleId": "BARCODE123", "handoverProofFileId": "uuid" }
```

### POST `/technician/appointments/:id/complete`

### POST `/technician/appointments/:id/failed`

```json
{ "reasonCode": "patient_not_at_home", "escalate": true }
```

### POST `/technician/appointments/:id/issue`

Escalation with notes + optional photos.

---

## Dietician / Health Coach APIs

### GET `/care/appointments`

Assigned session appointments only.

### GET `/care/appointments/:id`

### POST `/care/appointments/:id/notes`

Session notes (visible per policy).

### POST `/care/appointments/:id/recommend-follow-up`

---

## Admin / Operations APIs

### GET `/admin/appointments`

Filters: date range, type, doctor, technician, patient, status, city, payment.

### POST `/admin/appointments`

Create on behalf of patient (same body as patient book + `patientId`).

### PATCH `/admin/appointments/:id/assign`

```json
{ "doctorId": "uuid", "technicianId": "uuid", "notify": true }
```

### PATCH `/admin/appointments/:id/status`

Override with mandatory reason (audited).

### GET `/admin/appointments/dashboard`

Today's KPIs: pending assignments, delayed techs, missed, etc.

### GET `/admin/appointments/:id/route-live`

Live technician positions for date.

### CRUD `/admin/appointment-types`

### CRUD `/admin/holidays`

### CRUD `/admin/booking-policies`

### POST `/admin/appointments/:id/remind`

Manual reminder trigger.

### GET `/admin/analytics/appointments`

Aggregates per spec §23.

### CRUD `/admin/notification-templates`

---

## Legacy compatibility (005)

Until deprecation, existing routes remain and map to unified service:

| Legacy | Unified |
|--------|---------|
| `GET /patient/appointments/slots?date=` | `GET /patient/appointments/slots?typeCode=home_visit&date=` |
| `POST /patient/appointments` | `POST /patient/appointments` with `typeCode=home_visit` |
| `GET /appointments` (staff) | `GET /admin/appointments` or role-filtered list |

---

## Error codes

| Code | HTTP | Meaning |
|------|------|---------|
| `SLOT_UNAVAILABLE` | 409 | Slot full or blocked |
| `POLICY_VIOLATION` | 422 | Reschedule/cancel outside window |
| `DOUBLE_BOOKING` | 409 | Doctor/technician conflict |
| `PAYMENT_REQUIRED` | 402 | Paid type without payment |
| `TELE_WINDOW_CLOSED` | 403 | Join outside allowed window |
| `PRESCRIPTION_NOT_APPROVED` | 403 | Patient access to draft |
| `SIGNATURE_REQUIRED` | 422 | Approve without signature |

---

## Webhooks / jobs (internal)

| Job | Schedule | Action |
|-----|----------|--------|
| `appointment-reminder-dispatch` | every 5 min | Send due reminders |
| `appointment-slot-generator` | nightly | Generate slots from availability |
| `appointment-missed-detector` | every 15 min | Mark missed if past grace |
| `prescription-pdf-generator` | on approve | Generate PDF + QR |
