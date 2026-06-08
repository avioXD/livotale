# Data Model: Sample Collection & Lab Workflow

**Spec**: [spec.md](./spec.md)

## New / Extended Tables

### `operations.sample_collections`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| appointment_id | uuid FK → appointments | UNIQUE |
| patient_id | uuid FK | |
| sample_code | varchar(32) UNIQUE | LGSC-YYYYMMDD-000001 |
| collection_type | enum | home, hospital, center |
| status | enum | see spec-sample-workflow |
| technician_id | uuid FK nullable | |
| lab_partner_id | uuid FK nullable | |
| lab_order_id | uuid FK nullable | |
| pincode | varchar(10) | for assignment |
| priority | enum | normal, urgent |
| collection_remarks | text | |
| sample_type | varchar(40) | blood, urine, etc. |
| tubes_count | int | |
| fasting_status | varchar(40) | |
| assigned_at | timestamptz | |
| collected_at | timestamptz | |
| handed_over_at | timestamptz | |
| received_at | timestamptz | |
| report_published_at | timestamptz | |
| created_at / updated_at | timestamptz | |

### `operations.sample_collection_status_history`

Append-only audit: sample_collection_id, from_status, to_status, changed_by, actor_role, reason, notes, geo jsonb, created_at

### `operations.sample_photos`

sample_collection_id, file_id, photo_type (container_label), visible_to_patient, visible_to_doctor, uploaded_by, geo jsonb, created_at

### `operations.sample_handovers`

sample_collection_id, technician_id, lab_partner_id, handover_at, location, container_count, condition, remarks, lab_receiver_user_id

### `operations.technician_service_pincodes`

technician_id, pincode, is_active

### `operations.technician_availability`

Mirror doctor_availability pattern for technicians

### `operations.sample_collection_config`

city_id nullable, collection_duration_minutes, travel_buffer_minutes, max_daily_appointments, service_radius_km

### Extend `operations.technicians`

- technician_type enum
- max_appointments_per_day int
- service_zone varchar
- profile_metadata jsonb

### `clinical.lab_report_approvals`

lab_report_id, approval_stage (admin, doctor), status, reviewer_id, reviewed_at, notes

## Enums

```sql
technician_type_enum: home_collector, hospital_collector, center_collector, Liver Fibrosis Scan_technician, multi_role
sample_collection_status_enum: (full list from spec)
sample_rejection_reason_enum: (from spec-lab-report-workflow)
```

## Relationships

```text
appointments 1──1 sample_collections
sample_collections 1──* sample_photos
sample_collections 1──* sample_collection_status_history
sample_collections 0──1 lab_orders
lab_orders 1──* lab_reports → lab_report_approvals
technicians *──* pincodes via technician_service_pincodes
```

## Indexes

- sample_collections(sample_code)
- sample_collections(patient_id, created_at DESC)
- sample_collections(technician_id, status)
- sample_collections(lab_partner_id, status)
- technician_service_pincodes(pincode, technician_id)
