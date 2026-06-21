-- Scan step notification templates (patient pref, schedule confirm, visit complete)

INSERT INTO integrations.message_templates (code, name, category, channel, subject_template, body_template, variables) VALUES
  ('scan_date_requested', 'Patient scan slot requested', 'scan', 'in_app', 'Patient requested scan slot', '{{patientName}} requested a FibroScan home visit · {{timeSlot}} for order {{orderNumber}}.', '["patientName","orderNumber","timeSlot"]'),
  ('scan_schedule_confirmed', 'Home visit confirmed', 'scan', 'in_app', 'Home visit confirmed', 'Your fibrosis scan is confirmed for {{scanScheduledAt}} · {{timeSlot}}. Technician {{technicianName}}.', '["scanScheduledAt","timeSlot","technicianName","orderNumber","patientName"]'),
  ('scan_schedule_confirmed', 'Home visit confirmed SMS', 'scan', 'sms', '', 'Livotale home visit confirmed for {{scanScheduledAt}} · {{timeSlot}}. Technician {{technicianName}}. Order {{orderNumber}}.', '["scanScheduledAt","timeSlot","technicianName","orderNumber","patientName"]'),
  ('technician_visit_assigned', 'Technician visit assigned', 'scan', 'in_app', 'New home visit assigned', 'Home FibroScan visit assigned for order {{orderNumber}} · {{scanScheduledAt}} · {{timeSlot}}.', '["orderNumber","scanScheduledAt","timeSlot","patientName","technicianName"]'),
  ('visit_started', 'Technician en route', 'scan', 'in_app', 'Technician en route', 'Technician is en route for order {{orderNumber}} ({{patientName}}).', '["orderNumber","patientName","technicianName"]'),
  ('visit_reached', 'Technician at location', 'scan', 'in_app', 'Technician at patient location', 'Technician reached the patient location for order {{orderNumber}}.', '["orderNumber","patientName","technicianName"]'),
  ('scan_completed', 'Scan completed SMS', 'scan', 'sms', '', 'Your Livotale fibrosis scan for order {{orderNumber}} is complete. Your report will be available soon.', '["orderNumber","patientName"]')
ON CONFLICT (code, channel) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template,
  variables = EXCLUDED.variables,
  updated_at = now();
