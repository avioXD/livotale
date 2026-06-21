# Spec: Doctor Consultation & Prescription

**Module**: Consultations, computer-generated Rx  
**Roles**: Doctor (write); Ops (assign); Patient (read published)  
**API base**: FastAPI `/api/v1`

## When required

Package PKG-3 only (unless admin manual override).

## Consultation entity

`consultation_id`, `order_id`, `patient_id`, `doctor_id`, `type` (video|offline), `scheduled_at`, `meeting_link`, `status`, `doctor_notes`, `follow_up_at`, `created_by`

## Consultation statuses

`doctor_assignment_pending`, `doctor_assigned`, `consultation_scheduled`, `consultation_in_progress`, `consultation_completed`, `prescription_pending`, `prescription_published`, `cancelled`, `rescheduled`

## Doctor capabilities

- View assigned consultation orders only (`require_doctor_order`)
- Read: patient profile, fibrosis scan, pathology, AI data, final report
- Add consultation notes
- Create prescription (structured + free text)

## Prescription entity

Header: letterhead, patient, doctor (degree, reg no from `staff.doctors`), date  
Body: diagnosis, clinical notes, medicines[], advice, diet, lifestyle, follow-up, warnings  
Footer: disclaimer, doctor signature image (future)  
**Statuses (runtime)**: `draft`, `published` only

## Medicine line

`name`, `strength`, `form`, `dosage`, `frequency`, `timing`, `duration`, `instruction`

## API endpoints

| Method | Path | Role |
|--------|------|------|
| GET | `/doctor/orders/{order_id}/org/prescriptions` | Doctor, Admin, Support |
| GET | `/doctor/orders/{order_id}/prescription` | Doctor, Admin, Support |
| GET | `/doctor/orders/{order_id}/org/prescriptions/{visit_log_id}` | Doctor, Admin, Support |
| PUT | `/doctor/orders/{order_id}/org/prescriptions/{visit_log_id}` | Doctor (assigned) |
| POST | `/doctor/orders/{order_id}/org/prescriptions/{visit_log_id}/publish` | Doctor (assigned) |
| POST | `/doctor/orders/{order_id}/org/prescriptions/{visit_log_id}/revise` | Doctor (assigned) |
| GET | `/patient-portal/orders/{order_id}/prescription?phone=` | Public (phone gate) |

## Publish rules

- Requires at least one medicine in `medicines[]`
- Generates PDF server-side via `LivePDFGenerationService` / `DummyPDFGenerationService`
- Sets visit log status → `prescription_published`
- Transitions order workflow → `prescription_generated`
- Published Rx is locked; direct edit returns 400

## Revision rules

- `POST .../revise` clones published Rx into new draft row linked via `revision_of`
- Multiple rows may share `visit_log_id`; lookups prefer active `draft` row (by status, version, updated_at)
- After revise, `PUT` draft and `POST` publish work on the draft row

## Auth rules

- Doctor must be assigned to order (`order.doctor_id == doctor_id`) for PUT/POST write endpoints
- Admin/support may read all prescriptions

## UI

- `DoctorConsultationDetailPage` → Prescription & follow-up tab
- `LiverCarePrescriptionEditor` — draft, save, publish, revise
- `PatientPrescriptionPage` — read published Rx + PDF link

## Related specs

- [09b-prescription-follow-up-visit.md](./09b-prescription-follow-up-visit.md) — follow-up visit scheduling
- [09c-care-coaching-follow-up.md](./09c-care-coaching-follow-up.md) — care team follow-up (separate module)
