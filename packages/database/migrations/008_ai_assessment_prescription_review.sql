-- 008: AI assessments, recommendations, safety flags, prescriptions, versions, items, reviews, signatures.

BEGIN;

CREATE TABLE ai.ai_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  trigger_type ai.trigger_type_enum NOT NULL,
  input_snapshot jsonb NOT NULL,
  model_name varchar(120) NOT NULL,
  model_version varchar(80) NOT NULL,
  risk_score numeric(8,2),
  risk_category clinical.risk_category_enum,
  diagnosis_summary text,
  package_recommendation_id uuid REFERENCES core.care_packages(id) ON DELETE SET NULL,
  improvement_prediction jsonb NOT NULL DEFAULT '{}'::jsonb,
  worsening_alert boolean NOT NULL DEFAULT false,
  status ai.assessment_status_enum NOT NULL DEFAULT 'generated',
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE core.patient_packages
  ADD CONSTRAINT fk_patient_packages_ai_assessment
  FOREIGN KEY (ai_assessment_id) REFERENCES ai.ai_assessments(id) ON DELETE SET NULL;

CREATE TABLE ai.ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_assessment_id uuid NOT NULL REFERENCES ai.ai_assessments(id) ON DELETE CASCADE,
  recommendation_type ai.recommendation_type_enum NOT NULL,
  title varchar(180) NOT NULL,
  description text,
  confidence_score numeric(5,2),
  severity ai.severity_enum NOT NULL DEFAULT 'info',
  requires_doctor_approval boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_recommendations_confidence_chk CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100))
);

CREATE TABLE ai.ai_safety_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  ai_assessment_id uuid REFERENCES ai.ai_assessments(id) ON DELETE SET NULL,
  flag_type ai.flag_type_enum NOT NULL,
  message text NOT NULL,
  priority ai.flag_priority_enum NOT NULL DEFAULT 'medium',
  status ai.flag_status_enum NOT NULL DEFAULT 'open',
  assigned_doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  acknowledged_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolved_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clinical.doctor_patient_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES clinical.doctors(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  UNIQUE (doctor_id, patient_id)
);

CREATE TABLE clinical.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  ai_assessment_id uuid REFERENCES ai.ai_assessments(id) ON DELETE SET NULL,
  prescription_type clinical.prescription_type_enum NOT NULL DEFAULT 'ai_draft',
  diagnosis text,
  diet_plan text,
  exercise_plan text,
  monitoring_plan text,
  status clinical.prescription_status_enum NOT NULL DEFAULT 'pending_doctor_review',
  doctor_notes text,
  signed_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prescriptions_ai_draft_not_approved_chk CHECK (
    prescription_type <> 'ai_draft' OR status NOT IN ('approved')
  ),
  CONSTRAINT prescriptions_doctor_final_requires_doctor_chk CHECK (
    prescription_type <> 'doctor_final' OR doctor_id IS NOT NULL
  ),
  CONSTRAINT prescriptions_approved_requires_signature_chk CHECK (
    status <> 'approved' OR (prescription_type = 'doctor_final' AND doctor_id IS NOT NULL AND approved_at IS NOT NULL)
  )
);

CREATE TRIGGER trg_prescriptions_updated_at
BEFORE UPDATE ON clinical.prescriptions
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE clinical.prescription_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES clinical.prescriptions(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  snapshot jsonb NOT NULL,
  edited_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  edit_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prescription_id, version_number)
);

CREATE TABLE clinical.prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES clinical.prescriptions(id) ON DELETE CASCADE,
  item_type clinical.prescription_item_type_enum NOT NULL,
  product_id uuid,
  name varchar(180) NOT NULL,
  dosage varchar(120),
  frequency varchar(120),
  duration_days int,
  instructions text,
  is_substitutable boolean NOT NULL DEFAULT false,
  source core.recommendation_source_enum NOT NULL DEFAULT 'ai',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prescription_items_duration_chk CHECK (duration_days IS NULL OR duration_days > 0)
);

CREATE TABLE clinical.doctor_review_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES clinical.prescriptions(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  action clinical.doctor_review_action_enum NOT NULL,
  notes text,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clinical.digital_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES clinical.doctors(id) ON DELETE CASCADE,
  prescription_id uuid REFERENCES clinical.prescriptions(id) ON DELETE CASCADE,
  signature_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  registration_number varchar(120) NOT NULL,
  signed_hash varchar(128),
  signed_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text
);

COMMIT;
