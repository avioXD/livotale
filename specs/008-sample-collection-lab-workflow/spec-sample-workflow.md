# Spec Split: Sample Collection, ID, Photo & Handover

**Parent**: [spec.md](./spec.md)

## Sample Collection ID

Format: `LGSC-YYYYMMDD-000001`

- Generated at booking when appointment type requires sample collection
- Stored on `operations.sample_collections.sample_code`
- Displayed as text + QR payload on technician UI
- Linked: appointment_id, patient_id, lab_order_id (optional)

## Collection Status Machine

```text
sample_id_generated → assigned → accepted → travel_started → reached_location
→ collection_started → sample_collected → sample_image_uploaded
→ pending_lab_handover → handed_over_to_lab → completed
```

Failure branch: `patient_not_available`, `address_not_found`, `patient_refused`, `failed`, `reschedule_requested`, `cancelled`

## Collection Form (Technician)

Required fields at `sample_collected`:

- sample_type (blood, urine, stool, Liver Fibrosis Scan, other)
- tubes_count, container_type, fasting_status
- collection_remarks, geo lat/lng, timestamp
- consent_confirmed boolean

## Sample Photo Rule

After writing/pasting LGSC ID on container:

- `POST /technician/sample-collections/:id/photo` → `storage.files` + `operations.sample_photos`
- `visible_to_patient = false`, `visible_to_doctor = false` (configurable)
- Visible to: admin, lab_partner

## Handover

Technician → lab:

- handover_at, handover_location, lab_partner_id, container_count, condition, remarks
- Status: `handed_over_to_lab` → lab marks `received_by_lab` or `rejected_by_lab`

## Chain of Custody Audit

Every transition writes to `operations.sample_collection_status_history` with actor, role, geo, remarks.
