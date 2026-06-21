-- 005: Care packages, package recommendation rules, enrollments, outcomes, and extensions.

BEGIN;

CREATE TABLE core.care_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(60) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  duration_days int NOT NULL,
  description text,
  target_condition text,
  base_price numeric(12,2) NOT NULL DEFAULT 0,
  discount_price numeric(12,2),
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT care_packages_duration_chk CHECK (duration_days > 0),
  CONSTRAINT care_packages_price_chk CHECK (base_price >= 0 AND (discount_price IS NULL OR discount_price >= 0))
);

CREATE TRIGGER trg_care_packages_updated_at
BEFORE UPDATE ON core.care_packages
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE core.package_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES core.care_packages(id) ON DELETE CASCADE,
  rule_name varchar(160) NOT NULL,
  min_fibroscan_kpa numeric(5,2),
  max_fibroscan_kpa numeric(5,2),
  min_bmi numeric(5,2),
  max_bmi numeric(5,2),
  has_diabetes boolean,
  min_age int,
  max_age int,
  fibrosis_stage clinical.fibrosis_stage_enum,
  steatosis_grade clinical.steatosis_grade_enum,
  fatty_liver_grade varchar(40),
  priority int NOT NULL DEFAULT 100,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, rule_name),
  CONSTRAINT package_rules_fibroscan_range_chk CHECK (min_fibroscan_kpa IS NULL OR max_fibroscan_kpa IS NULL OR min_fibroscan_kpa <= max_fibroscan_kpa),
  CONSTRAINT package_rules_bmi_range_chk CHECK (min_bmi IS NULL OR max_bmi IS NULL OR min_bmi <= max_bmi),
  CONSTRAINT package_rules_age_range_chk CHECK (min_age IS NULL OR max_age IS NULL OR min_age <= max_age)
);

CREATE TABLE core.patient_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES core.care_packages(id) ON DELETE RESTRICT,
  recommended_by core.recommendation_source_enum NOT NULL DEFAULT 'ai',
  ai_assessment_id uuid,
  doctor_approved_by uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  status core.package_status_enum NOT NULL DEFAULT 'recommended',
  price_charged numeric(12,2) NOT NULL DEFAULT 0,
  payment_status core.payment_status_enum NOT NULL DEFAULT 'pending',
  dropout_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_packages_dates_chk CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date),
  CONSTRAINT patient_packages_price_chk CHECK (price_charged >= 0)
);

CREATE TRIGGER trg_patient_packages_updated_at
BEFORE UPDATE ON core.patient_packages
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE core.package_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_package_id uuid NOT NULL UNIQUE REFERENCES core.patient_packages(id) ON DELETE CASCADE,
  baseline_fibroscan_kpa numeric(5,2),
  final_fibroscan_kpa numeric(5,2),
  baseline_sgpt numeric(8,2),
  final_sgpt numeric(8,2),
  baseline_sgot numeric(8,2),
  final_sgot numeric(8,2),
  baseline_weight_kg numeric(5,2),
  final_weight_kg numeric(5,2),
  baseline_liver_score numeric(5,2),
  final_liver_score numeric(5,2),
  improvement_percent numeric(6,2),
  extension_offered boolean NOT NULL DEFAULT false,
  extension_discount_percent numeric(5,2),
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT package_outcomes_discount_chk CHECK (extension_discount_percent IS NULL OR (extension_discount_percent >= 0 AND extension_discount_percent <= 100))
);

CREATE TABLE core.package_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_package_id uuid NOT NULL REFERENCES core.patient_packages(id) ON DELETE CASCADE,
  offered_package_id uuid REFERENCES core.care_packages(id) ON DELETE SET NULL,
  offered_discount_percent numeric(5,2),
  status core.package_extension_status_enum NOT NULL DEFAULT 'offered',
  offer_expires_at timestamptz,
  accepted_at timestamptz,
  notification_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT package_extensions_discount_chk CHECK (offered_discount_percent IS NULL OR (offered_discount_percent >= 0 AND offered_discount_percent <= 100))
);

CREATE TABLE core.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES identity.users(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES clinical.patients(id) ON DELETE CASCADE,
  channel core.notification_channel_enum NOT NULL DEFAULT 'in_app',
  title varchar(180) NOT NULL,
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status core.notification_status_enum NOT NULL DEFAULT 'queued',
  scheduled_at timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE core.package_extensions
  ADD CONSTRAINT fk_package_extensions_notification
  FOREIGN KEY (notification_id) REFERENCES core.notifications(id) ON DELETE SET NULL;

COMMIT;
