-- 009: Patient scores, daily dashboard snapshots, and weekly check-ins.

BEGIN;

CREATE TABLE clinical.patient_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  source clinical.health_score_source_enum NOT NULL DEFAULT 'system',
  ai_assessment_id uuid REFERENCES ai.ai_assessments(id) ON DELETE SET NULL,
  liver_score numeric(5,2),
  color_code clinical.score_color_enum,
  compliance_score numeric(5,2),
  risk_score numeric(8,2),
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_scores_range_chk CHECK (
    (liver_score IS NULL OR (liver_score >= 0 AND liver_score <= 100)) AND
    (compliance_score IS NULL OR (compliance_score >= 0 AND compliance_score <= 100))
  )
);

CREATE TABLE clinical.health_metric_daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  weight_kg numeric(5,2),
  bmi numeric(5,2),
  sgpt numeric(10,2),
  sgot numeric(10,2),
  hba1c numeric(6,2),
  triglycerides numeric(10,2),
  fibroscan_kpa numeric(5,2),
  cap_dbm numeric(6,2),
  liver_score numeric(5,2),
  compliance_score numeric(5,2),
  source jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, snapshot_date)
);

CREATE TABLE clinical.patient_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  patient_package_id uuid REFERENCES core.patient_packages(id) ON DELETE SET NULL,
  checkin_week_start date NOT NULL,
  weight_kg numeric(5,2) NOT NULL,
  diet_compliance_percent int,
  exercise_compliance_percent int,
  medicine_compliance_percent int,
  alcohol_intake clinical.alcohol_intake_enum NOT NULL DEFAULT 'unknown',
  symptoms jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  ai_recalculated_score numeric(5,2),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, checkin_week_start),
  CONSTRAINT patient_checkins_weight_chk CHECK (weight_kg > 0),
  CONSTRAINT patient_checkins_compliance_chk CHECK (
    (diet_compliance_percent IS NULL OR diet_compliance_percent BETWEEN 0 AND 100) AND
    (exercise_compliance_percent IS NULL OR exercise_compliance_percent BETWEEN 0 AND 100) AND
    (medicine_compliance_percent IS NULL OR medicine_compliance_percent BETWEEN 0 AND 100)
  )
);

COMMIT;
