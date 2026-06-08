# Spec: Doctor Consultation & Prescription

**Module**: Consultations, computer-generated Rx  
**Roles**: Doctor (write); Ops (assign); Patient (read published)

## When required

Package PKG-3 only (unless admin manual override).

## Consultation entity

`consultation_id`, `order_id`, `patient_id`, `doctor_id`, `type` (video|offline), `scheduled_at`, `meeting_link` (dummy), `status`, `doctor_notes`, `follow_up_at`, `created_by`

## Consultation statuses

`doctor_assignment_pending`, `doctor_assigned`, `consultation_scheduled`, `consultation_in_progress`, `consultation_completed`, `prescription_pending`, `prescription_published`, `cancelled`, `rescheduled`

## Doctor capabilities

- View assigned consultation orders
- Read: patient profile, fibrosis scan, pathology, AI data, final report
- Add consultation notes
- Create prescription (structured + free text)

## Prescription entity

Header: letterhead, patient, doctor (degree, reg no), date  
Body: diagnosis, clinical notes, medicines[], advice, diet, lifestyle, follow-up, warnings  
Footer: disclaimer, doctor signature image  
Statuses: `draft`, `review`, `published`, `cancelled`, `revised`

## Medicine line

`name`, `strength`, `form`, `dosage`, `frequency`, `timing`, `duration`, `instruction`

## Publish rules

- Published → patient portal + PDF download
- Locked; revision creates `revision_of` link + history
- `DummyPDFGenerationService.generatePrescriptionPdf()`

## UI realign

- `DoctorAppointmentsPage` → consultation orders for PKG-3
- New `PrescriptionEditorPage` with preview + publish
- Extend existing `PrescriptionsPage` for patient/doctor views
