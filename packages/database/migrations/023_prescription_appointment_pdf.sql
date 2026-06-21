-- 023: Appointment-linked prescriptions + PDF storage (007 Phase 4)

BEGIN;

ALTER TABLE clinical.prescriptions
  ADD COLUMN IF NOT EXISTS appointment_id uuid
    REFERENCES operations.appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chief_complaint text,
  ADD COLUMN IF NOT EXISTS supplements jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_tests jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lifestyle_advice jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS follow_up_days int,
  ADD COLUMN IF NOT EXISTS prescription_number varchar(32);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prescriptions_appointment
  ON clinical.prescriptions(appointment_id)
  WHERE appointment_id IS NOT NULL;

CREATE TABLE clinical.prescription_pdfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES clinical.prescriptions(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES operations.appointments(id) ON DELETE SET NULL,
  pdf_file_id uuid NOT NULL REFERENCES storage.files(id) ON DELETE RESTRICT,
  prescription_number varchar(32) NOT NULL,
  qr_verification_code varchar(64) NOT NULL,
  qr_payload text NOT NULL,
  version_number int NOT NULL DEFAULT 1,
  is_current boolean NOT NULL DEFAULT true,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT prescription_pdfs_version_chk CHECK (version_number > 0)
);

CREATE UNIQUE INDEX idx_prescription_pdfs_current
  ON clinical.prescription_pdfs(prescription_id)
  WHERE is_current = true;

CREATE INDEX idx_prescription_pdfs_appointment
  ON clinical.prescription_pdfs(appointment_id)
  WHERE appointment_id IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS clinical.prescription_number_seq START 1001;

COMMIT;
