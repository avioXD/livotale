-- 033: Liver care pathology, AI extraction, reports, audit (extends 032)

-- Link fibroscan results to service orders
ALTER TABLE IF EXISTS clinical.fibroscan_results
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES commerce.service_orders(id);

CREATE INDEX IF NOT EXISTS idx_fibroscan_results_order_id
  ON clinical.fibroscan_results(order_id);

-- Lab report uploads
CREATE TABLE IF NOT EXISTS integrations.lab_report_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.service_orders(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  partner_lab_id uuid,
  file_name text NOT NULL,
  file_url text,
  file_id text,
  uploaded_by text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  extraction_status text NOT NULL DEFAULT 'not_started',
  final_status text NOT NULL DEFAULT 'pending',
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_report_uploads_order_id
  ON integrations.lab_report_uploads(order_id);

-- AI extraction jobs
CREATE TABLE IF NOT EXISTS integrations.ai_extraction_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.service_orders(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('pathology', 'fibrosis_scan')),
  source_file_id text,
  status text NOT NULL DEFAULT 'queued',
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integrations.extracted_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES integrations.ai_extraction_jobs(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  extracted_value text,
  editable_value text,
  unit text,
  reference_range text,
  flag text DEFAULT 'normal',
  confidence_score numeric(5,4),
  source_page int,
  verified boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_ai_extraction_jobs_order_id
  ON integrations.ai_extraction_jobs(order_id);

-- Final reports & templates
CREATE TABLE IF NOT EXISTS clinical.letterhead_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  html_body text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinical.final_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.service_orders(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  report_type text NOT NULL,
  report_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  pdf_url text,
  file_id text,
  generated_at timestamptz,
  published_at timestamptz,
  authorized_by text,
  version int NOT NULL DEFAULT 1,
  qr_code_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_final_reports_order_id
  ON clinical.final_reports(order_id);

-- Extend lab partners (profile fields)
ALTER TABLE IF EXISTS operations.lab_partners
  ADD COLUMN IF NOT EXISTS gst_number text,
  ADD COLUMN IF NOT EXISTS contract_start date,
  ADD COLUMN IF NOT EXISTS contract_end date,
  ADD COLUMN IF NOT EXISTS supported_tests jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes text;

-- Notifications & audit
CREATE TABLE IF NOT EXISTS integrations.notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  template text,
  recipient text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'sent',
  order_id uuid REFERENCES commerce.service_orders(id),
  patient_id uuid,
  trigger_event text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_log_order_id
  ON integrations.notifications_log(order_id);

CREATE TABLE IF NOT EXISTS audit.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  old_value text,
  new_value text,
  performed_by text NOT NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_at ON audit.audit_log(performed_at DESC);
