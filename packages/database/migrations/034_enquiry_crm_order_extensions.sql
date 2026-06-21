-- 034: Enquiry CRM follow-up logs and order outcome fields.

BEGIN;

CREATE TABLE IF NOT EXISTS operations.enquiry_follow_up_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES operations.enquiries(id) ON DELETE CASCADE,
  status operations.enquiry_status_enum NOT NULL,
  internal_notes text,
  call_remarks text,
  follow_up_at timestamptz,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enquiry_follow_up_logs_enquiry
  ON operations.enquiry_follow_up_logs(enquiry_id, created_at ASC);

ALTER TABLE operations.enquiries
  ADD COLUMN IF NOT EXISTS order_outcome varchar(40),
  ADD COLUMN IF NOT EXISTS order_outcome_remarks text;

ALTER TABLE commerce.service_orders
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS scan_time_slot varchar(80),
  ADD COLUMN IF NOT EXISTS scan_patient_preferred_at timestamptz,
  ADD COLUMN IF NOT EXISTS pathology_lab_order_ref varchar(120),
  ADD COLUMN IF NOT EXISTS pathology_time_slot varchar(80),
  ADD COLUMN IF NOT EXISTS pathology_patient_preferred_at timestamptz,
  ADD COLUMN IF NOT EXISTS pathology_scheduled_at timestamptz;

COMMIT;
