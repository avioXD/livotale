# Spec Split: Lab Testing, Reports & Approval

**Parent**: [spec.md](./spec.md)

## Lab User (lab_partner role)

Scoped to `operations.lab_partners` linked to user. Sees samples for their lab/center only.

## Lab Dashboard Queues

- Pending receive
- Received today
- Testing in progress
- Report pending upload
- Pending approval
- Rejected samples
- Completed / published

## Receive / Reject

`POST /lab/sample-collections/:id/receive` — verify LGSC ID, photo, containers

`POST /lab/sample-collections/:id/reject` — reason enum + notes → notify admin, technician; optional patient notify

Rejection reasons: sample_id_mismatch, image_unclear, damaged, leaked, wrong_container, insufficient_quantity, delayed_delivery, not_labelled, patient_mismatch, test_not_possible, other

## Testing & Report

After receive:

```text
received_by_lab → testing_started → testing_in_progress → report_uploaded → pending_approval
```

Lab user can:

- Enter structured results (extends `clinical.lab_order_items`)
- Upload PDF/image (`clinical.lab_reports` + `storage.files`)
- Flag abnormal / critical values

## Approval Models (configurable v1: admin_then_patient)

Default flow:

```text
Lab upload → pending_admin_review → approved → published_to_patient
```

Optional doctor review flag on test type.

Doctor review: `pending_doctor_review` → doctor approves → publish

Patient sees only `published_to_patient` reports on `/reports` and appointment detail.

## Recollection

Admin `POST /admin/sample-collections/:id/recollection` creates linked appointment with new LGSC ID; marks original `recollection_required`.
