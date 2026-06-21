-- 019: Clinical report display codes for patient-facing report library.

BEGIN;

ALTER TABLE clinical.lab_reports
  ADD COLUMN IF NOT EXISTS report_code varchar(32);

ALTER TABLE clinical.patient_old_reports
  ADD COLUMN IF NOT EXISTS report_code varchar(32);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_reports_report_code
  ON clinical.lab_reports(report_code) WHERE report_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_old_reports_report_code
  ON clinical.patient_old_reports(report_code) WHERE report_code IS NOT NULL;

COMMIT;
