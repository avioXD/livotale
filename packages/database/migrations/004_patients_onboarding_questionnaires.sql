-- 004: Patient profiles, addresses, comorbidities, onboarding questionnaires, and old reports.

BEGIN;

CREATE TABLE clinical.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES identity.users(id) ON DELETE CASCADE,
  patient_code varchar(60) NOT NULL UNIQUE,
  primary_doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  clinic_id uuid REFERENCES core.clinics(id) ON DELETE SET NULL,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  height_cm numeric(5,2),
  current_weight_kg numeric(5,2),
  bmi numeric(5,2),
  blood_group varchar(10),
  alcohol_status clinical.alcohol_status_enum NOT NULL DEFAULT 'unknown',
  smoking_status clinical.smoking_status_enum NOT NULL DEFAULT 'unknown',
  diabetes boolean NOT NULL DEFAULT false,
  hypertension boolean NOT NULL DEFAULT false,
  dyslipidemia boolean NOT NULL DEFAULT false,
  viral_hepatitis boolean NOT NULL DEFAULT false,
  known_cirrhosis boolean NOT NULL DEFAULT false,
  emergency_contact_name varchar(160),
  emergency_contact_mobile varchar(20),
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patients_height_chk CHECK (height_cm IS NULL OR height_cm > 0),
  CONSTRAINT patients_weight_chk CHECK (current_weight_kg IS NULL OR current_weight_kg > 0),
  CONSTRAINT patients_bmi_chk CHECK (bmi IS NULL OR bmi > 0)
);

CREATE TRIGGER trg_patients_updated_at
BEFORE UPDATE ON clinical.patients
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE clinical.patient_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  address_type clinical.address_type_enum NOT NULL DEFAULT 'home',
  line1 text NOT NULL,
  line2 text,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  pincode varchar(12),
  latitude numeric(10,7),
  longitude numeric(10,7),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_patient_addresses_default
ON clinical.patient_addresses(patient_id)
WHERE is_default = true;

CREATE TRIGGER trg_patient_addresses_updated_at
BEFORE UPDATE ON clinical.patient_addresses
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE clinical.patient_comorbidities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  code varchar(80) NOT NULL,
  name varchar(160) NOT NULL,
  diagnosed_on date,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, code)
);

CREATE TABLE clinical.questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL UNIQUE,
  title varchar(180) NOT NULL,
  version varchar(40) NOT NULL,
  status core.record_status_enum NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_questionnaires_active_code
ON clinical.questionnaires(code)
WHERE status = 'active';

CREATE TRIGGER trg_questionnaires_updated_at
BEFORE UPDATE ON clinical.questionnaires
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE clinical.questionnaire_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id uuid NOT NULL REFERENCES clinical.questionnaires(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type clinical.question_type_enum NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_weight numeric(8,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clinical.patient_questionnaire_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  questionnaire_id uuid NOT NULL REFERENCES clinical.questionnaires(id) ON DELETE RESTRICT,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  total_score numeric(8,2),
  risk_category clinical.risk_category_enum,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL
);

CREATE TABLE clinical.patient_questionnaire_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES clinical.patient_questionnaire_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES clinical.questionnaire_questions(id) ON DELETE RESTRICT,
  answer jsonb NOT NULL,
  score numeric(8,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (response_id, question_id)
);

CREATE TABLE clinical.patient_old_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES storage.files(id) ON DELETE RESTRICT,
  report_type varchar(80),
  report_date date,
  notes text,
  uploaded_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
