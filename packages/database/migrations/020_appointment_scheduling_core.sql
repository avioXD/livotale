-- 020: Unified RBAC appointment scheduling core (007-rbac-appointment-scheduling Phase 0)

BEGIN;

CREATE TYPE operations.appointment_visit_mode_enum AS ENUM ('home', 'clinic', 'tele');

CREATE TYPE operations.appointment_status_enum AS ENUM (
  'draft',
  'pending_payment',
  'booked',
  'confirmed',
  'doctor_assigned',
  'technician_assigned',
  'reminder_sent',
  'patient_confirmed',
  'technician_on_the_way',
  'technician_arrived',
  'sample_collected',
  'report_pending',
  'report_uploaded',
  'waiting_for_doctor',
  'consultation_started',
  'prescription_drafted',
  'prescription_approved',
  'completed',
  'rescheduled',
  'cancelled_by_patient',
  'cancelled_by_admin',
  'cancelled_by_doctor',
  'no_show',
  'missed',
  'follow_up_required',
  'closed'
);

CREATE TYPE operations.appointment_payment_status_enum AS ENUM (
  'unpaid',
  'pending',
  'paid',
  'refunded',
  'waived'
);

CREATE TYPE operations.appointment_slot_type_enum AS ENUM (
  'clinic',
  'tele',
  'home_review',
  'emergency'
);

CREATE TYPE operations.appointment_slot_status_enum AS ENUM (
  'open',
  'partial',
  'full',
  'blocked'
);

CREATE TABLE operations.appointment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  base_price numeric(12,2) NOT NULL DEFAULT 0,
  requires_doctor boolean NOT NULL DEFAULT false,
  requires_technician boolean NOT NULL DEFAULT false,
  requires_equipment jsonb NOT NULL DEFAULT '[]'::jsonb,
  allows_home boolean NOT NULL DEFAULT false,
  allows_clinic boolean NOT NULL DEFAULT true,
  allows_tele boolean NOT NULL DEFAULT false,
  cancellation_window_hours int NOT NULL DEFAULT 24,
  reschedule_window_hours int NOT NULL DEFAULT 24,
  max_reschedules int NOT NULL DEFAULT 2,
  reminder_schedule jsonb NOT NULL DEFAULT '[1440,120,15]'::jsonb,
  default_follow_up_days int,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_types_duration_chk CHECK (duration_minutes > 0),
  CONSTRAINT appointment_types_price_chk CHECK (base_price >= 0)
);

CREATE TRIGGER trg_appointment_types_updated_at
BEFORE UPDATE ON operations.appointment_types
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE SEQUENCE IF NOT EXISTS operations.appointment_code_seq START 1;

CREATE TABLE operations.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_code varchar(32) NOT NULL UNIQUE,
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  appointment_type_id uuid NOT NULL REFERENCES operations.appointment_types(id) ON DELETE RESTRICT,
  visit_mode operations.appointment_visit_mode_enum NOT NULL DEFAULT 'home',
  status operations.appointment_status_enum NOT NULL DEFAULT 'booked',
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  technician_id uuid REFERENCES operations.technicians(id) ON DELETE SET NULL,
  care_team_member_id uuid REFERENCES care.care_team_members(id) ON DELETE SET NULL,
  address_id uuid REFERENCES clinical.patient_addresses(id) ON DELETE SET NULL,
  legacy_home_visit_id uuid UNIQUE REFERENCES operations.home_visits(id) ON DELETE SET NULL,
  chief_complaint text,
  symptoms text,
  internal_notes text,
  tele_meeting_url text,
  tele_join_opens_at timestamptz,
  tele_join_closes_at timestamptz,
  payment_status operations.appointment_payment_status_enum NOT NULL DEFAULT 'unpaid',
  payment_amount numeric(12,2) NOT NULL DEFAULT 0,
  reschedule_count int NOT NULL DEFAULT 0,
  preferred_time_slot varchar(40),
  patient_notes text,
  assigned_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointments_time_chk CHECK (scheduled_end > scheduled_start),
  CONSTRAINT appointments_reschedule_count_chk CHECK (reschedule_count >= 0)
);

CREATE TRIGGER trg_appointments_updated_at
BEFORE UPDATE ON operations.appointments
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE INDEX idx_appointments_patient_start ON operations.appointments(patient_id, scheduled_start DESC);
CREATE INDEX idx_appointments_doctor_start ON operations.appointments(doctor_id, scheduled_start)
  WHERE doctor_id IS NOT NULL;
CREATE INDEX idx_appointments_technician_start ON operations.appointments(technician_id, scheduled_start)
  WHERE technician_id IS NOT NULL;
CREATE INDEX idx_appointments_status ON operations.appointments(status);
CREATE INDEX idx_appointments_scheduled_start ON operations.appointments(scheduled_start);

CREATE TABLE operations.appointment_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES operations.appointments(id) ON DELETE CASCADE,
  from_status operations.appointment_status_enum,
  to_status operations.appointment_status_enum NOT NULL,
  changed_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  actor_role varchar(40) NOT NULL DEFAULT 'system',
  reason text,
  notes text,
  is_system_generated boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointment_status_history_appt
  ON operations.appointment_status_history(appointment_id, occurred_at ASC);

ALTER TABLE operations.home_visits
  ADD COLUMN IF NOT EXISTS appointment_id uuid UNIQUE
    REFERENCES operations.appointments(id) ON DELETE SET NULL;

-- Configurable appointment types (007 spec §3)
INSERT INTO operations.appointment_types(
  code, name, duration_minutes, base_price,
  requires_doctor, requires_technician, requires_equipment,
  allows_home, allows_clinic, allows_tele,
  cancellation_window_hours, reschedule_window_hours, max_reschedules,
  default_follow_up_days
) VALUES
  ('home_visit', 'Home Visit', 90, 1499, false, true, '["Liver Fibrosis Scan"]'::jsonb, true, false, false, 24, 24, 2, 30),
  ('clinic_visit', 'Clinic Visit', 45, 799, true, false, '[]'::jsonb, false, true, false, 12, 12, 2, 30),
  ('teleconsultation', 'Teleconsultation', 30, 599, true, false, '[]'::jsonb, false, false, true, 6, 6, 2, 14),
  ('doctor_consultation', 'Doctor Consultation', 30, 999, true, false, '[]'::jsonb, false, true, true, 12, 12, 2, 30),
  ('fibroscan', 'Liver Fibrosis Scan Appointment', 45, 2499, false, true, '["Liver Fibrosis Scan"]'::jsonb, true, true, false, 24, 24, 2, 90),
  ('blood_sample_collection', 'Blood Sample Collection', 30, 499, false, true, '[]'::jsonb, true, true, false, 12, 12, 2, 30),
  ('dietician_consultation', 'Dietician Consultation', 45, 699, false, false, '[]'::jsonb, false, true, true, 12, 12, 2, 30),
  ('health_coach_follow_up', 'Health Coach Follow-up', 30, 0, false, false, '[]'::jsonb, false, true, true, 12, 12, 2, 30),
  ('package_follow_up', 'Package Follow-up Visit', 60, 0, true, true, '["Liver Fibrosis Scan"]'::jsonb, true, true, false, 24, 24, 2, 30),
  ('emergency_priority', 'Emergency / Priority Visit', 60, 1999, true, true, '[]'::jsonb, true, true, true, 2, 2, 1, 7)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  duration_minutes = EXCLUDED.duration_minutes,
  base_price = EXCLUDED.base_price,
  requires_doctor = EXCLUDED.requires_doctor,
  requires_technician = EXCLUDED.requires_technician,
  allows_home = EXCLUDED.allows_home,
  allows_clinic = EXCLUDED.allows_clinic,
  allows_tele = EXCLUDED.allows_tele;

-- RBAC permissions (007 spec contracts)
INSERT INTO identity.permissions(code, description) VALUES
  ('appointment.book_own', 'Book own appointments'),
  ('appointment.view_own', 'View own appointments and timeline'),
  ('appointment.view_assigned', 'View assigned appointments'),
  ('appointment.view_all', 'View all clinic appointments'),
  ('appointment.manage_availability', 'Manage doctor availability and slots'),
  ('appointment.assign_staff', 'Assign or reassign doctors and technicians'),
  ('appointment.override_status', 'Override appointment status with audit'),
  ('appointment.manage_types', 'Manage appointment types and policies'),
  ('prescription.view_own_approved', 'View own approved prescriptions only')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO identity.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM identity.roles r
JOIN identity.permissions p ON
  (r.code = 'patient' AND p.code IN ('appointment.book_own', 'appointment.view_own', 'prescription.view_own_approved')) OR
  (r.code = 'doctor' AND p.code IN ('appointment.view_assigned', 'appointment.manage_availability')) OR
  (r.code = 'technician' AND p.code IN ('appointment.view_assigned')) OR
  (r.code IN ('dietician', 'health_coach') AND p.code IN ('appointment.view_assigned', 'care.view_assigned_patient')) OR
  (r.code IN ('admin', 'support') AND p.code IN (
    'appointment.view_all', 'appointment.assign_staff', 'appointment.override_status', 'admin.view_operations'
  )) OR
  (r.code = 'admin' AND p.code IN ('appointment.manage_types'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Backfill unified appointments from existing home visits
INSERT INTO operations.appointments(
  appointment_code,
  patient_id,
  appointment_type_id,
  visit_mode,
  status,
  scheduled_start,
  scheduled_end,
  technician_id,
  address_id,
  legacy_home_visit_id,
  payment_status,
  payment_amount,
  preferred_time_slot,
  patient_notes,
  created_by,
  created_at,
  updated_at
)
SELECT
  'APT-' || to_char(hv.created_at, 'YYYY') || '-' || lpad(nextval('operations.appointment_code_seq')::text, 5, '0'),
  hv.patient_id,
  at.id,
  'home'::operations.appointment_visit_mode_enum,
  CASE hv.status
    WHEN 'booked' THEN 'booked'::operations.appointment_status_enum
    WHEN 'assigned' THEN 'technician_assigned'::operations.appointment_status_enum
    WHEN 'in_progress' THEN 'consultation_started'::operations.appointment_status_enum
    WHEN 'completed' THEN 'completed'::operations.appointment_status_enum
    WHEN 'cancelled' THEN 'cancelled_by_patient'::operations.appointment_status_enum
    WHEN 'rescheduled' THEN 'rescheduled'::operations.appointment_status_enum
    WHEN 'no_show' THEN 'no_show'::operations.appointment_status_enum
    ELSE 'booked'::operations.appointment_status_enum
  END,
  hv.scheduled_at,
  hv.scheduled_at + (COALESCE(at.duration_minutes, 90) || ' minutes')::interval,
  hv.technician_id,
  hv.address_id,
  hv.id,
  'unpaid'::operations.appointment_payment_status_enum,
  COALESCE(at.base_price, 0),
  hv.preferred_time_slot,
  hv.patient_notes,
  hv.created_by,
  hv.created_at,
  hv.updated_at
FROM operations.home_visits hv
JOIN operations.appointment_types at ON at.code = CASE hv.visit_type
  WHEN 'initial' THEN 'home_visit'
  WHEN 'followup' THEN 'package_follow_up'
  WHEN 'repeat_fibroscan' THEN 'fibroscan'
  WHEN 'blood_collection' THEN 'blood_sample_collection'
  WHEN 'package_completion' THEN 'package_follow_up'
  ELSE 'home_visit'
END
WHERE NOT EXISTS (
  SELECT 1 FROM operations.appointments a WHERE a.legacy_home_visit_id = hv.id
);

UPDATE operations.home_visits hv
SET appointment_id = a.id
FROM operations.appointments a
WHERE a.legacy_home_visit_id = hv.id
  AND hv.appointment_id IS NULL;

INSERT INTO operations.appointment_status_history(
  appointment_id, from_status, to_status, actor_role, reason, notes, is_system_generated, occurred_at
)
SELECT
  a.id,
  NULL,
  a.status,
  'system',
  'migration_backfill',
  'Imported from home_visits',
  true,
  a.created_at
FROM operations.appointments a
WHERE NOT EXISTS (
  SELECT 1 FROM operations.appointment_status_history h
  WHERE h.appointment_id = a.id AND h.reason = 'migration_backfill'
);

COMMIT;
