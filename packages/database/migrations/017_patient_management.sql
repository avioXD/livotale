-- 017: Patient management module — extended demographics, clinical histories, timeline.

BEGIN;

ALTER TABLE clinical.patients
  ADD COLUMN IF NOT EXISTS occupation varchar(120),
  ADD COLUMN IF NOT EXISTS marital_status varchar(40),
  ADD COLUMN IF NOT EXISTS waist_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS lifestyle_type varchar(40),
  ADD COLUMN IF NOT EXISTS food_preference varchar(40),
  ADD COLUMN IF NOT EXISTS sleep_pattern varchar(80),
  ADD COLUMN IF NOT EXISTS stress_level varchar(40),
  ADD COLUMN IF NOT EXISTS physical_activity_level varchar(40);

CREATE TABLE IF NOT EXISTS clinical.patient_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  condition_code varchar(80) NOT NULL,
  condition_name varchar(160) NOT NULL,
  is_present boolean NOT NULL DEFAULT false,
  year_diagnosed integer,
  current_status varchar(80),
  medication_ongoing boolean,
  treating_doctor varchar(160),
  control_status varchar(80),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, condition_code)
);

CREATE TRIGGER trg_patient_conditions_updated_at
BEFORE UPDATE ON clinical.patient_conditions
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE IF NOT EXISTS clinical.patient_liver_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE REFERENCES clinical.patients(id) ON DELETE CASCADE,
  fatty_liver jsonb NOT NULL DEFAULT '{}'::jsonb,
  fibrosis jsonb NOT NULL DEFAULT '{}'::jsonb,
  cirrhosis jsonb NOT NULL DEFAULT '{}'::jsonb,
  viral_hepatitis jsonb NOT NULL DEFAULT '{}'::jsonb,
  alcohol_history jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_patient_liver_history_updated_at
BEFORE UPDATE ON clinical.patient_liver_history
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE IF NOT EXISTS clinical.patient_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  medicine_name varchar(160) NOT NULL,
  dose varchar(80),
  frequency varchar(80),
  route varchar(40),
  start_date date,
  end_date date,
  prescribed_by varchar(160),
  purpose text,
  is_current boolean NOT NULL DEFAULT true,
  stop_reason text,
  side_effects text,
  compliance varchar(40),
  category varchar(60),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_patient_medications_updated_at
BEFORE UPDATE ON clinical.patient_medications
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE IF NOT EXISTS clinical.patient_allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  allergy_type varchar(40) NOT NULL,
  allergen_name varchar(160) NOT NULL,
  reaction_type varchar(80),
  severity varchar(40),
  first_noticed date,
  treatment_required text,
  emergency_history boolean NOT NULL DEFAULT false,
  alert_flag boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_patient_allergies_updated_at
BEFORE UPDATE ON clinical.patient_allergies
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE IF NOT EXISTS clinical.patient_surgeries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  surgery_name varchar(160) NOT NULL,
  surgery_date date,
  hospital_name varchar(160),
  surgeon_name varchar(160),
  reason text,
  complications text,
  is_liver_related boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_patient_surgeries_updated_at
BEFORE UPDATE ON clinical.patient_surgeries
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE IF NOT EXISTS clinical.patient_vaccinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  vaccine_name varchar(120) NOT NULL,
  dose_number integer,
  vaccination_date date,
  next_due_date date,
  status varchar(40) NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_patient_vaccinations_updated_at
BEFORE UPDATE ON clinical.patient_vaccinations
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE IF NOT EXISTS clinical.patient_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  event_type varchar(80) NOT NULL,
  event_category varchar(60) NOT NULL,
  title varchar(200) NOT NULL,
  description text,
  actor_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  actor_role varchar(40),
  related_entity_type varchar(60),
  related_entity_id uuid,
  status varchar(40),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_timeline_patient_date
  ON clinical.patient_timeline_events(patient_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_medications_patient
  ON clinical.patient_medications(patient_id, is_current DESC);

CREATE INDEX IF NOT EXISTS idx_patient_allergies_patient
  ON clinical.patient_allergies(patient_id) WHERE alert_flag = true;

COMMIT;
