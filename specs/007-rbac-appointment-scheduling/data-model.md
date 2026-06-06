# Data Model: RBAC Appointment Scheduling

**Feature**: 007-rbac-appointment-scheduling | **Migration target**: `019`–`022` (phased)

## Design Principles

1. **Unified appointment** — `operations.appointments` is the canonical record; legacy `home_visits` linked via `legacy_home_visit_id` during migration.
2. **Append-only history** — status, reschedule, cancel, missed events never deleted.
3. **RBAC at row level** — queries filtered by role + assignment, not UI-only hiding.
4. **Reuse existing clinical tables** — prescriptions, consultations, vitals, routes extended with `appointment_id`.

## Entity Relationship (high level)

```text
appointment_types ──< appointments >── patients
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    appointment_slots  status_history  payments
         │               │
    doctor_availability  reschedules / cancellations / missed_records
         │
    doctor_holidays

appointments ──< technician_geo_locations
appointments ──> technician_routes / route_stops (via visit link)
appointments ──> care.consultations (tele)
appointments ──> clinical.prescriptions
appointments ──> operations.visit_vitals (home field)
appointments ──> reminder_logs / notification delivery
```

## New / Extended Tables

### `operations.appointment_types`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| code | varchar UNIQUE | e.g. `home_visit`, `teleconsultation` |
| name | varchar | Display name |
| duration_minutes | int | |
| base_price | numeric | |
| requires_doctor | bool | |
| requires_technician | bool | |
| requires_equipment | jsonb | e.g. `["fibroscan"]` |
| allows_home | bool | |
| allows_clinic | bool | |
| allows_tele | bool | |
| cancellation_window_hours | int | |
| reschedule_window_hours | int | |
| max_reschedules | int | |
| reminder_schedule | jsonb | e.g. `[1440,120,15]` minutes before |
| default_follow_up_days | int | nullable |
| is_active | bool | |
| metadata | jsonb | |

### `operations.appointments`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| appointment_code | varchar UNIQUE | Human-readable e.g. `APT-2026-00042` |
| patient_id | uuid FK | |
| appointment_type_id | uuid FK | |
| visit_mode | enum | `home`, `clinic`, `tele` |
| status | appointment_status_enum | See spec lifecycle |
| scheduled_start | timestamptz | |
| scheduled_end | timestamptz | |
| doctor_id | uuid FK nullable | |
| technician_id | uuid FK nullable | |
| dietician_member_id | uuid FK nullable | care_team_members |
| address_id | uuid FK nullable | home visits |
| consultation_id | uuid FK nullable | care.consultations |
| legacy_home_visit_id | uuid FK nullable | migration |
| chief_complaint | text | |
| symptoms | text | |
| internal_notes | text | staff-only |
| tele_meeting_url | text | |
| tele_join_opens_at | timestamptz | |
| tele_join_closes_at | timestamptz | |
| payment_status | enum | `unpaid`, `pending`, `paid`, `refunded`, `waived` |
| payment_amount | numeric | |
| reschedule_count | int default 0 | |
| assigned_by | uuid | |
| created_by | uuid | |
| created_at / updated_at | timestamptz | |

Indexes: `(patient_id, scheduled_start)`, `(doctor_id, scheduled_start)`, `(technician_id, scheduled_start)`, `(status)`, `(scheduled_start)`.

### `operations.appointment_slots`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| doctor_id | uuid FK | nullable for technician-only types |
| slot_date | date | |
| start_time | time | |
| end_time | time | |
| slot_type | enum | `clinic`, `tele`, `home_review`, `emergency` |
| status | enum | `open`, `partial`, `full`, `blocked` |
| max_bookings | int default 1 | |
| current_bookings | int default 0 | |
| is_blocked | bool | |
| block_reason | text | |
| appointment_type_id | uuid FK nullable | filter |

Unique: `(doctor_id, slot_date, start_time, slot_type)` where not blocked.

### `operations.doctor_availability`

Recurring weekly rules + effective date range.

| Column | Type |
|--------|------|
| id, doctor_id, day_of_week (0–6), start_time, end_time |
| slot_duration_minutes, buffer_minutes |
| max_appointments_per_day |
| visit_modes allowed (jsonb) |
| effective_from, effective_to |

### `operations.doctor_holidays`

| Column | Type |
|--------|------|
| id, title, holiday_type enum |
| start_date, end_date |
| affected_doctor_ids jsonb or join table |
| affected_appointment_type_ids jsonb |
| reason, created_by |

### `operations.appointment_status_history`

Extends pattern of `appointment_status_events` (018).

| Column | Type |
|--------|------|
| id, appointment_id |
| from_status, to_status |
| changed_by, actor_role |
| reason, notes |
| is_system_generated |
| occurred_at |

### `operations.appointment_reschedules`

| Column | Type |
|--------|------|
| id, appointment_id |
| from_start, to_start |
| reason, rescheduled_by, actor_role |
| policy_passed, created_at |

### `operations.appointment_cancellations`

| Column | Type |
|--------|------|
| id, appointment_id |
| cancelled_by, actor_role |
| reason_code, reason_text |
| refund_eligible, cancellation_charge |
| created_at |

### `operations.appointment_missed_records`

| Column | Type |
|--------|------|
| id, appointment_id |
| missed_type enum | `no_show`, `missed` |
| reason_code, reason_text |
| marked_by, actor_role |
| follow_up_task_id uuid nullable |
| created_at |

### `operations.technician_geo_locations`

| Column | Type |
|--------|------|
| id, appointment_id, technician_id |
| latitude, longitude, accuracy_m |
| recorded_at |
| source enum | `manual`, `gps` |

Retention: stop collecting after appointment `completed` / `closed`.

### `operations.appointment_reminder_logs`

| Column | Type |
|--------|------|
| id, appointment_id |
| reminder_type | `24h`, `2h`, `15m`, custom |
| channel, recipient_user_id |
| template_code, status |
| sent_at, delivery_status, retry_count, failure_reason |

### `operations.appointment_payments`

| Column | Type |
|--------|------|
| id, appointment_id |
| amount, currency |
| status, provider_ref |
| paid_at, refunded_at |

### `operations.appointment_internal_notes`

Doctor/admin notes not visible to patient.

| Column | Type |
|--------|------|
| id, appointment_id, author_id, note, visible_to_patient default false |

### `operations.teleconsultation_sessions`

| Column | Type |
|--------|------|
| id, appointment_id |
| meeting_url, meeting_provider |
| patient_joined_at, doctor_joined_at |
| started_at, ended_at |
| recording_file_id nullable |

### `clinical.prescription_pdfs`

| Column | Type |
|--------|------|
| id, prescription_id, appointment_id |
| pdf_file_id, prescription_number |
| qr_verification_code, qr_payload |
| version_number, is_current |
| generated_at, generated_by |

### Extensions to existing tables

| Table | Add |
|-------|-----|
| `care.consultations` | `appointment_id uuid FK` |
| `clinical.prescriptions` | `appointment_id uuid FK` |
| `operations.visit_vitals` | already via visit; add `appointment_id` |
| `operations.home_visits` | `appointment_id uuid FK` (backfill) |
| `clinical.patient_timeline_events` | `appointment_id uuid` if missing |

## Enums (new)

```sql
-- operations.appointment_status_enum (30+ values from spec)
-- operations.appointment_visit_mode_enum: home, clinic, tele
-- operations.appointment_payment_status_enum
-- operations.slot_type_enum
-- operations.holiday_type_enum: clinic, doctor_leave, technician_leave, area, emergency_closure
-- operations.missed_reason_code_enum (configurable lookup OK)
-- operations.cancellation_reason_code_enum
```

## Migration from 005

1. Seed `appointment_types` from existing `visit_type_enum` + new types.
2. Backfill `appointments` from `home_visits` 1:1.
3. Copy `appointment_status_events` → `appointment_status_history`.
4. Adapter in API: legacy routes `/patient/appointments` delegate to unified service until deprecation.

## Audit

All sensitive actions → `audit.activity_logs` (016) with `entity_type = 'appointment'`, `entity_id`, `action`, `metadata`.
