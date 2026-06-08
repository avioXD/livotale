# Spec: Pathology & Partner Lab Management

**Module**: External partner labs only — no in-house lab setup  
**Roles**: Admin (lab CRUD); Operations (assign lab, dispatch tracking, upload report); Technician (send blood sample)

## Partner lab profile

`lab_id`, `name`, `contact_person`, `phone`, `email`, `address`, `city`, `state`, `pincode`, `gst`, `registration_number`, `legal_docs[]`, `agreement_doc`, `report_format_sample`, `supported_tests[]`, `charges_per_test`, `package_charges`, `annual_tieup_charges`, `billing_cycle`, `contract_start`, `contract_end`, `active`, `notes`

## Pathology workflow (PKG-2, PKG-3 only)

No in-house processing. Blood sample is sent to an external partner lab; the lab emails the PDF report to Livotale operations.

| Step | Actor | Action | System status |
|------|-------|--------|---------------|
| 1 | Operations | Assign `partner_lab_id` on order | `pending_dispatch` |
| 2 | Technician or Operations | Mark blood sample sent (courier/handoff ref optional) | `dispatched` |
| 3 | Operations | Confirm partner lab received sample | `received_at_lab` |
| 4 | Operations | Mark awaiting report (lab will email PDF) | `awaiting_report` |
| 5 | Operations | Upload PDF attachment from lab email (`uploadReportFromEmail`) | `report_uploaded` |
| 6 | System (auto) | AI extracts fields → saves to DB (mock: `MOCK_AI_JOBS`) | `review_pending` |
| 7 | Operations | Review & verify extracted fields | `verified` |
| 8 | Operations | Generate Livotale letterhead PDF → publish to patient | `final_report_generated` |

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
- Ops order detail: Partner lab pathology stepper (assign → dispatch → received → awaiting email → upload PDF)
- Technician order detail: `SampleDispatchPanel` — mark sample sent after scan
- AI review: `/admin/operations?tab=ai-review` + order detail extraction panel
- Deprecated: standalone lab-partner login and in-house lab sample processing (`008` legacy)

## API

- `GET/POST/PATCH /admin/lab-partners`
- `GET /admin/pathology/sample-dispatch-queue`
- `POST /admin/orders/:id/assign-lab`
- `POST /admin/orders/:id/sample-dispatch`
- `POST /admin/orders/:id/sample-dispatch/received`
- `POST /admin/orders/:id/sample-dispatch/awaiting-report`
- `POST /admin/orders/:id/lab-report` (multipart PDF)
- `GET /admin/orders/:id/pathology`
