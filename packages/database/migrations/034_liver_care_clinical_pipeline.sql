-- 034: Liver care technician, pathology dispatch, consultation, and prescription pipeline

BEGIN;

CREATE TABLE IF NOT EXISTS operations.sample_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.service_orders(id),
  partner_lab_id uuid REFERENCES operations.lab_partners(id),
  status text NOT NULL DEFAULT 'pending_dispatch',
  collected_at timestamptz,
  dispatched_at timestamptz,
  received_at_lab timestamptz,
  awaiting_report_at timestamptz,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sample_dispatches_order_id ON operations.sample_dispatches(order_id);

CREATE TABLE IF NOT EXISTS operations.technician_order_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.service_orders(id),
  technician_id uuid REFERENCES identity.users(id),
  visit_step text NOT NULL DEFAULT 'assigned',
  started_at timestamptz,
  reached_at timestamptz,
  completed_at timestamptz,
  unable_reason text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_technician_order_visits_order_id ON operations.technician_order_visits(order_id);

CREATE TABLE IF NOT EXISTS clinical.scan_patient_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES commerce.service_orders(id),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  patient_verified boolean NOT NULL DEFAULT false,
  fibroscan_intake_submitted boolean NOT NULL DEFAULT false,
  fibroscan_intake_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinical.fibrosis_scan_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES commerce.service_orders(id),
  lsm_kpa numeric,
  cap_db_m numeric,
  iqr numeric,
  probe_type text,
  device_serial text,
  fibrosis_stage text,
  steatosis_grade text,
  interpretation text,
  source text DEFAULT 'manual',
  locked boolean NOT NULL DEFAULT false,
  report_file_id uuid REFERENCES storage.files(id),
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinical.order_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES commerce.service_orders(id),
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL REFERENCES clinical.doctors(id),
  doctor_name varchar(200) NOT NULL,
  consultation_type varchar(40) NOT NULL DEFAULT 'video',
  scheduled_at timestamptz,
  meeting_link text,
  status varchar(60) NOT NULL DEFAULT 'doctor_assigned',
  doctor_notes text,
  symptoms text,
  visit_completed_at timestamptz,
  follow_up_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinical.consultation_visit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.service_orders(id),
  consultation_id uuid NOT NULL REFERENCES clinical.order_consultations(id),
  visit_type varchar(40) NOT NULL DEFAULT 'initial',
  visit_number int NOT NULL DEFAULT 1,
  scheduled_at timestamptz,
  visit_completed_at timestamptz,
  follow_up_at timestamptz,
  symptoms text,
  doctor_notes text,
  status varchar(60) NOT NULL DEFAULT 'scheduled',
  prescription_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_visit_logs_order_id ON clinical.consultation_visit_logs(order_id);

CREATE TABLE IF NOT EXISTS clinical.liver_care_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.service_orders(id),
  visit_log_id uuid NOT NULL REFERENCES clinical.consultation_visit_logs(id),
  patient_id uuid NOT NULL,
  consultation_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  doctor_name varchar(200) NOT NULL,
  doctor_degree varchar(200),
  doctor_registration varchar(120),
  status varchar(40) NOT NULL DEFAULT 'draft',
  diagnosis text,
  clinical_notes text,
  symptoms text,
  visit_date timestamptz,
  follow_up_date timestamptz,
  medicines jsonb NOT NULL DEFAULT '[]'::jsonb,
  diet_advice text,
  lifestyle_advice text,
  follow_up_advice text,
  warning_signs text,
  pdf_url text,
  file_id text,
  published_at timestamptz,
  revision_of uuid,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_liver_care_prescriptions_order_id ON clinical.liver_care_prescriptions(order_id);

ALTER TABLE commerce.service_orders
  ADD COLUMN IF NOT EXISTS scan_time_slot varchar,
  ADD COLUMN IF NOT EXISTS scan_patient_preferred_at timestamptz,
  ADD COLUMN IF NOT EXISTS pathology_lab_order_ref varchar,
  ADD COLUMN IF NOT EXISTS pathology_time_slot varchar,
  ADD COLUMN IF NOT EXISTS pathology_patient_preferred_at timestamptz,
  ADD COLUMN IF NOT EXISTS pathology_scheduled_at timestamptz;

COMMIT;
