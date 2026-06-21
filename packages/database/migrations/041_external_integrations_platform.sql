-- 041: External integrations platform — settings, unified message templates, letterhead seed

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'integrations' AND t.typname = 'message_template_category_enum'
  ) THEN
    CREATE TYPE integrations.message_template_category_enum AS ENUM (
      'otp', 'enquiry', 'order', 'scan', 'lab', 'report', 'appointment', 'system'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS integrations.platform_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  twilio_account_sid varchar(64),
  twilio_auth_token_enc bytea,
  twilio_messaging_service_sid varchar(64),
  twilio_verify_service_sid varchar(64),
  sendgrid_api_key_enc bytea,
  sendgrid_from_email varchar(320),
  sendgrid_from_name varchar(160),
  ai_provider varchar(40),
  ai_api_key_enc bytea,
  ai_model varchar(120),
  ai_base_url text,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO integrations.platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS integrations.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL,
  name varchar(160) NOT NULL,
  category integrations.message_template_category_enum NOT NULL DEFAULT 'system',
  channel core.notification_channel_enum NOT NULL DEFAULT 'in_app',
  subject_template text NOT NULL DEFAULT '',
  body_template text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_message_templates_code_channel UNIQUE (code, channel)
);

DROP TRIGGER IF EXISTS trg_message_templates_updated_at ON integrations.message_templates;
CREATE TRIGGER trg_message_templates_updated_at
BEFORE UPDATE ON integrations.message_templates
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_message_templates_category ON integrations.message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_code ON integrations.message_templates(code);

-- Migrate appointment templates from legacy table
INSERT INTO integrations.message_templates (code, name, category, channel, subject_template, body_template, variables)
SELECT
  code,
  name,
  'appointment'::integrations.message_template_category_enum,
  channel,
  subject_template,
  body_template,
  '["typeName","scheduledAt","appointmentCode","patientName"]'::jsonb
FROM operations.appointment_notification_templates
ON CONFLICT (code, channel) DO UPDATE SET
  name = EXCLUDED.name,
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template,
  updated_at = now();

-- Seed liver-care and system templates
INSERT INTO integrations.message_templates (code, name, category, channel, subject_template, body_template, variables) VALUES
  ('otp_sent', 'Patient portal OTP', 'otp', 'sms', '', 'Your Livotale verification code is sent to your phone. Valid for 10 minutes.', '["patientName"]'),
  ('technician_intake_otp', 'Technician intake OTP', 'otp', 'sms', '', 'Your Livotale intake verification code has been sent.', '["orderNumber","patientName"]'),
  ('visit_completion_otp', 'Visit completion OTP', 'otp', 'sms', '', 'Your Livotale visit completion code has been sent.', '["orderNumber","patientName"]'),

  ('enquiry_received', 'New enquiry', 'enquiry', 'in_app', 'New website enquiry', 'New enquiry from {{patientName}} ({{patientPhone}}).', '["patientName","patientPhone"]'),
  ('enquiry_received', 'New enquiry email', 'enquiry', 'email', 'New enquiry — {{patientName}}', 'A new enquiry was received from {{patientName}} ({{patientPhone}}).', '["patientName","patientPhone"]'),
  ('enquiry_assigned', 'Enquiry assigned', 'enquiry', 'in_app', 'Enquiry assigned to you', 'You have been assigned enquiry from {{patientName}}.', '["patientName","orderCode"]'),
  ('enquiry_converted', 'Enquiry converted', 'enquiry', 'in_app', 'Enquiry converted to order', 'Enquiry for {{patientName}} has been converted to order {{orderNumber}}.', '["patientName","orderNumber"]'),
  ('order_created', 'Order created', 'order', 'in_app', 'Order {{orderNumber}} created', 'Your Livotale order {{orderNumber}} for {{packageName}} has been created.', '["orderNumber","packageName","patientName"]'),
  ('payment_link_sent', 'Payment link', 'order', 'sms', '', 'Pay ₹{{amount}} for Livotale order {{orderNumber}}: {{paymentLink}}', '["orderNumber","amount","paymentLink","patientName"]'),
  ('payment_link_sent', 'Payment link email', 'order', 'email', 'Payment link — {{orderNumber}}', 'Please complete payment of ₹{{amount}} for order {{orderNumber}}: {{paymentLink}}', '["orderNumber","amount","paymentLink","patientName"]'),
  ('payment_link_sent', 'Payment link in-app', 'order', 'in_app', 'Payment link sent', 'Payment link for ₹{{amount}} sent for order {{orderNumber}}.', '["orderNumber","amount","patientName"]'),
  ('payment_completed', 'Payment completed', 'order', 'in_app', 'Payment received', 'Payment of ₹{{amount}} received for order {{orderNumber}}.', '["orderNumber","amount","patientName"]'),
  ('payment_completed', 'Payment completed SMS', 'order', 'sms', '', 'Payment of ₹{{amount}} received for Livotale order {{orderNumber}}. Thank you!', '["orderNumber","amount","patientName"]'),
  ('payment_failed', 'Payment failed', 'order', 'in_app', 'Payment failed', 'Payment attempt failed for order {{orderNumber}}. Please retry.', '["orderNumber","patientName"]'),

  ('technician_assigned', 'Technician assigned', 'scan', 'in_app', 'Technician assigned', '{{technicianName}} assigned for your fibrosis scan (order {{orderNumber}}).', '["technicianName","orderNumber","patientName"]'),
  ('technician_assigned', 'Technician assigned SMS', 'scan', 'sms', '', 'Technician {{technicianName}} assigned for your Livotale scan. Order {{orderNumber}}.', '["technicianName","orderNumber","patientName"]'),
  ('scan_scheduled', 'Scan scheduled', 'scan', 'in_app', 'Scan scheduled', 'Your fibrosis scan is scheduled for {{scanScheduledAt}}.', '["scanScheduledAt","orderNumber","patientName"]'),
  ('scan_scheduled', 'Scan scheduled SMS', 'scan', 'sms', '', 'Livotale scan scheduled for {{scanScheduledAt}}. Order {{orderNumber}}.', '["scanScheduledAt","orderNumber","patientName"]'),
  ('scan_started', 'Scan started', 'scan', 'in_app', 'Scan in progress', 'Technician has started the fibrosis scan for order {{orderNumber}}.', '["orderNumber"]'),
  ('scan_completed', 'Scan completed', 'scan', 'in_app', 'Scan completed', 'Fibrosis scan completed for order {{orderNumber}}.', '["orderNumber","patientName"]'),
  ('scan_reviewed', 'Scan reviewed', 'scan', 'in_app', 'Scan reviewed', 'Scan data reviewed for order {{orderNumber}}.', '["orderNumber"]'),

  ('lab_assigned', 'Lab assigned', 'lab', 'in_app', 'Partner lab assigned', 'Partner lab assigned for order {{orderNumber}}.', '["orderNumber","partnerLabName"]'),
  ('sample_dispatch_pending', 'Sample ready', 'lab', 'in_app', 'Sample ready for dispatch', 'Blood sample ready to send to lab for order {{orderNumber}}.', '["orderNumber"]'),
  ('sample_dispatched', 'Sample dispatched', 'lab', 'in_app', 'Sample dispatched', 'Sample dispatched to partner lab for order {{orderNumber}}.', '["orderNumber"]'),
  ('sample_received_at_lab', 'Sample at lab', 'lab', 'in_app', 'Sample received at lab', 'Partner lab confirmed sample receipt for order {{orderNumber}}.', '["orderNumber"]'),
  ('awaiting_lab_report', 'Awaiting lab report', 'lab', 'in_app', 'Awaiting lab report', 'Waiting for pathology report for order {{orderNumber}}.', '["orderNumber"]'),
  ('awaiting_lab_report', 'Awaiting lab report email', 'lab', 'email', 'Awaiting lab report — {{orderNumber}}', 'Pathology report pending from partner lab for order {{orderNumber}}.', '["orderNumber"]'),
  ('lab_report_uploaded', 'Lab report uploaded', 'lab', 'in_app', 'Lab report uploaded', 'Pathology report uploaded for order {{orderNumber}}.', '["orderNumber"]'),
  ('ai_extraction_ready', 'AI extraction ready', 'lab', 'in_app', 'AI extraction ready', 'AI extraction complete — review pending for order {{orderNumber}}.', '["orderNumber"]'),
  ('ai_reupload_required', 'AI reupload required', 'lab', 'in_app', 'Reupload required', 'New pathology PDF required for order {{orderNumber}}.', '["orderNumber"]'),
  ('ai_verified', 'AI verified', 'lab', 'in_app', 'AI fields verified', 'Extracted pathology fields verified for order {{orderNumber}}.', '["orderNumber"]'),

  ('final_report_generated', 'Report generated', 'report', 'in_app', 'Final report generated', 'Final report generated for order {{orderNumber}}.', '["orderNumber","reportNumber"]'),
  ('final_report_published', 'Report published', 'report', 'in_app', 'Your report is ready', 'Your Livotale report for order {{orderNumber}} is available.', '["orderNumber","reportUrl","patientName"]'),
  ('final_report_published', 'Report published SMS', 'report', 'sms', '', 'Your Livotale report for order {{orderNumber}} is ready: {{reportUrl}}', '["orderNumber","reportUrl","patientName"]'),
  ('doctor_assigned', 'Doctor assigned', 'report', 'in_app', 'Doctor assigned', 'Dr. {{doctorName}} assigned for order {{orderNumber}}.', '["doctorName","orderNumber","patientName"]'),
  ('consultation_scheduled', 'Consultation scheduled', 'report', 'in_app', 'Consultation scheduled', 'Video consultation scheduled for {{consultationScheduledAt}}.', '["consultationScheduledAt","orderNumber","doctorName"]'),
  ('consultation_completed', 'Consultation completed', 'report', 'in_app', 'Consultation completed', 'Consultation completed for order {{orderNumber}}.', '["orderNumber"]'),
  ('prescription_published', 'Prescription published', 'report', 'in_app', 'Prescription ready', 'Your prescription for order {{orderNumber}} is available.', '["orderNumber","patientName"]'),
  ('prescription_published', 'Prescription SMS', 'report', 'sms', '', 'Your Livotale prescription for order {{orderNumber}} is ready.', '["orderNumber","patientName"]'),

  ('audit_alert', 'Audit alert', 'system', 'in_app', 'Security alert', '{{alertMessage}}', '["alertMessage"]'),
  ('audit_alert', 'Audit alert email', 'system', 'email', 'Livotale security alert', '{{alertMessage}}', '["alertMessage"]')
ON CONFLICT (code, channel) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO clinical.letterhead_templates (code, name, html_body, active)
VALUES (
  'default',
  'Default clinic letterhead',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 24px; }
    .company { font-size: 22px; font-weight: bold; color: #2563eb; }
    .meta { font-size: 12px; color: #666; margin-top: 4px; }
    h1 { font-size: 18px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f3f4f6; }
    .footer { margin-top: 40px; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 12px; }
  </style></head><body>
    <div class="header">
      <div class="company">{{ companyName }}</div>
      <div class="meta">{{ email }}</div>
    </div>
    <h1>{{ reportTypeLabel }}</h1>
    <p><strong>Patient:</strong> {{ patientName }} · <strong>Order:</strong> {{ orderNumber }}</p>
    <p><strong>Report #:</strong> {{ reportNumber }} · <strong>Date:</strong> {{ generatedAt }}</p>
    {% if fibrosisSection %}<h2>{{ fibrosisSection.title }}</h2><table><tr><th>Parameter</th><th>Value</th></tr>
    {% for row in fibrosisSection.rows %}<tr><td>{{ row.label }}</td><td>{{ row.value }}</td></tr>{% endfor %}
    </table>{% endif %}
    {% if pathologySection %}<h2>{{ pathologySection.title }}</h2><table><tr><th>Test</th><th>Value</th><th>Flag</th></tr>
    {% for row in pathologySection.rows %}<tr><td>{{ row.label }}</td><td>{{ row.value }}</td><td>{{ row.flag }}</td></tr>{% endfor %}
    </table>{% endif %}
    <p>{{ interpretation }}</p>
    <div class="footer">{{ disclaimer }} · {{ footer }}</div>
  </body></html>',
  true
)
ON CONFLICT (code) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  updated_at = now();

COMMIT;
