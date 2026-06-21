-- 007: Liver Fibrosis Scan, lab tests, blood samples, lab results, and report files.

BEGIN;

CREATE TABLE clinical.fibroscan_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES operations.home_visits(id) ON DELETE SET NULL,
  liver_stiffness_kpa numeric(5,2) NOT NULL,
  cap_dbm numeric(6,2),
  iqr_median_percent numeric(5,2),
  valid_measurements int,
  total_measurements int,
  fibrosis_stage clinical.fibrosis_stage_enum NOT NULL DEFAULT 'unknown',
  steatosis_grade clinical.steatosis_grade_enum NOT NULL DEFAULT 'unknown',
  machine_serial varchar(120),
  report_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  recorded_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fibroscan_kpa_chk CHECK (liver_stiffness_kpa > 0),
  CONSTRAINT fibroscan_iqr_chk CHECK (iqr_median_percent IS NULL OR iqr_median_percent >= 0),
  CONSTRAINT fibroscan_measurements_chk CHECK (
    valid_measurements IS NULL OR total_measurements IS NULL OR
    (valid_measurements >= 0 AND total_measurements >= valid_measurements)
  )
);

CREATE TABLE clinical.lab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(60) NOT NULL UNIQUE,
  name varchar(180) NOT NULL,
  unit varchar(40),
  normal_min numeric(12,4),
  normal_max numeric(12,4),
  category clinical.lab_category_enum NOT NULL DEFAULT 'other',
  sort_order int NOT NULL DEFAULT 0,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_tests_range_chk CHECK (normal_min IS NULL OR normal_max IS NULL OR normal_min <= normal_max)
);

CREATE TABLE clinical.lab_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES operations.home_visits(id) ON DELETE SET NULL,
  ordered_by core.recommendation_source_enum NOT NULL DEFAULT 'doctor',
  doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  lab_partner_id uuid REFERENCES operations.lab_partners(id) ON DELETE SET NULL,
  status operations.sample_status_enum NOT NULL DEFAULT 'pending',
  sample_collected_at timestamptz,
  report_uploaded_at timestamptz,
  ordered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_lab_orders_updated_at
BEFORE UPDATE ON clinical.lab_orders
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE clinical.lab_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id uuid NOT NULL REFERENCES clinical.lab_orders(id) ON DELETE CASCADE,
  lab_test_id uuid NOT NULL REFERENCES clinical.lab_tests(id) ON DELETE RESTRICT,
  result_value numeric(12,4),
  result_text varchar(255),
  unit varchar(40),
  reference_range varchar(120),
  flag clinical.lab_flag_enum NOT NULL DEFAULT 'unknown',
  resulted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lab_order_id, lab_test_id)
);

CREATE TABLE clinical.lab_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id uuid NOT NULL REFERENCES clinical.lab_orders(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES operations.home_visits(id) ON DELETE SET NULL,
  sample_code varchar(80) NOT NULL UNIQUE,
  sample_type varchar(80) NOT NULL,
  tubes_count int,
  collected_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  collected_at timestamptz,
  courier_tracking_code varchar(120),
  status operations.sample_status_enum NOT NULL DEFAULT 'pending',
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_samples_tubes_chk CHECK (tubes_count IS NULL OR tubes_count >= 0)
);

CREATE TABLE clinical.lab_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id uuid NOT NULL REFERENCES clinical.lab_orders(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES storage.files(id) ON DELETE RESTRICT,
  report_date date,
  uploaded_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  verified boolean NOT NULL DEFAULT false,
  verified_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
