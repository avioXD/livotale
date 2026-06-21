# Spec: Pathology & Partner Lab Management

**Module**: External partner labs only — no in-house lab setup  
**Roles**: Admin (lab CRUD); Operations (assign lab, schedule lab-partner visit, upload report)

**Active model (2026-06):** Lab partner visits patient at scheduled time — not technician courier dispatch. Legacy courier `sample-dispatch` APIs exist but are not used in the order detail UI.

## Partner lab profile

`lab_id`, `name`, `contact_person`, `phone`, `email`, `address`, `city`, `state`, `pincode`, `gst`, `registration_number`, `legal_docs[]`, `agreement_doc`, `report_format_sample`, `supported_tests[]`, `charges_per_test`, `package_charges`, `annual_tieup_charges`, `billing_cycle`, `contract_start`, `contract_end`, `active`, `notes`

## Pathology workflow (PKG-2, PKG-3 only)

No in-house processing. Lab partner visits patient; lab emails PDF to Livotale operations.

| Step | Actor | Action | System status |
|------|-------|--------|---------------|
| 0 | Patient (optional) | Submit preferred pathology visit | preference stored on order |
| 1 | Operations | Assign `partner_lab_id` + create internal lab order ref | `pathology_pending` |
| 2 | Operations | Book on lab partner website + save portal order ID | `pathology_external_appointment_id` |
| 3 | Operations | Confirm pathology visit schedule | scheduled |
| 4 | Operations | Mark collector visited (watching lab portal) | `pathology_visit_outcome = visited` |
| 5 | Operations | Mark sample collected (watching lab portal) | dispatch `sample_collected` |
| 6 | Operations | Mark received at lab / awaiting report | dispatch sub-status |
| 7 | Operations | Upload PDF from lab email | `lab_report_uploaded` |
| 8 | System (auto) | AI extraction on upload | `ai_extraction_pending` |
| 9 | Operations | Review & verify extracted fields | `ai_extraction_completed` |
| 10 | Operations | Generate letterhead PDF → publish | `final_report_generated` |

### Micro-specs

- `.specify/specs/pathology-external-appointment-id/spec.md`
- `.specify/specs/pathology-visit-confirmation/spec.md`
- `.specify/specs/pathology-api-reliability/spec.md`
- `.specify/specs/pathology-ui-alignment/spec.md`
- `.specify/specs/pathology-e2e-journey/spec.md`

Notifications: see `spec-notification-triggers.md` (`lab_assigned`, `sample_dispatched`, `awaiting_lab_report`, `lab_report_uploaded`).

## Sample dispatch entity

`dispatch_id`, `order_id`, `partner_lab_id`, `status` (`pending_dispatch` → `report_uploaded`), `dispatched_by`, `dispatched_at`, `received_at_lab_at`, `awaiting_report_since`, `courier_ref`, `updated_at`

## Lab report upload entity

`report_id`, `order_id`, `patient_id`, `partner_lab_id`, `file_id`, `uploaded_by`, `uploaded_at`, `source_type` (`partner_lab_email`), `email_from`, `email_subject`, `email_received_at`, `file_size_bytes`, `extraction_status`, `extracted_json`, `verified_by`, `verified_at`, `final_status`

## Dynamic pathology parameters

Store as `extracted_fields[]` with: `field_name`, `value`, `unit`, `reference_range`, `flag`, `custom` boolean.

Default parameter set (seed): Hb, WBC, platelets, FBS, HbA1c, bilirubin panel, SGOT, SGPT, ALP, GGT, proteins, PT/INR, lipids, creatinine, urea, TSH, HBsAg, Anti-HCV + extensible custom fields.

## UI

- Admin: `/admin/lab-partners` — partner lab profiles
- Ops hub: `/admin/operations?tab=partner-lab` — dispatch queue across orders
- Ops order detail: Partner lab pathology stepper (assign → schedule → lab visit → upload PDF → AI → letterhead)
- Patient portal: `PatientPathologyScheduleSection` — preferred visit date (PKG-2/3)
- AI review: `/admin/operations?tab=ai-review` + order detail extraction panel
- Deprecated: standalone lab-partner login and in-house lab sample processing (`008` legacy)

## API

- `GET/POST/PATCH /admin/lab-partners`
- `GET /admin/pathology/sample-dispatch-queue`
- `GET /admin/pathology/lab-report-queue` — query: `search`, `dispatchStatus`, `labId`, `extractionStatus`
- `GET /admin/pathology/lab-report-queue/:orderId`
- `POST /admin/orders/:id/assign-lab`
- `POST /admin/orders/:id/sample-dispatch`
- `POST /admin/orders/:id/sample-dispatch/received`
- `POST /admin/orders/:id/sample-dispatch/awaiting-report`
- `POST /admin/orders/:id/lab-report` (multipart PDF)
- `GET /admin/orders/:id/pathology`
