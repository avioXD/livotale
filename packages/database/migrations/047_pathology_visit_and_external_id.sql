-- Pathology external appointment ID + visit confirmation on service orders

ALTER TABLE commerce.service_orders
  ADD COLUMN IF NOT EXISTS pathology_external_appointment_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS pathology_visit_outcome VARCHAR(16),
  ADD COLUMN IF NOT EXISTS pathology_visit_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pathology_visit_confirmed_by UUID REFERENCES identity.users(id);

ALTER TABLE integrations.lab_report_uploads
  ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_service_orders_pathology_external_appt
  ON commerce.service_orders (pathology_external_appointment_id)
  WHERE pathology_external_appointment_id IS NOT NULL;

COMMENT ON COLUMN commerce.service_orders.pathology_external_appointment_id IS
  'Appointment/order ID from 3rd-party lab partner site (ops-entered)';
COMMENT ON COLUMN commerce.service_orders.pathology_visit_outcome IS
  'Lab collector visit outcome: visited | no_show';
