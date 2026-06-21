-- Patient consult preference fields (mirrors scan_patient_preferred_at pattern)

ALTER TABLE commerce.service_orders
  ADD COLUMN IF NOT EXISTS consultation_patient_preferred_at timestamptz,
  ADD COLUMN IF NOT EXISTS consultation_time_slot text;

INSERT INTO integrations.message_templates (code, name, category, channel, subject_template, body_template, variables) VALUES
  (
    'consultation_date_requested',
    'Patient consult slot requested',
    'consultation',
    'in_app',
    'Patient requested consult slot',
    '{{patientName}} requested a teleconsult · {{timeSlot}} for order {{orderNumber}}.',
    '["patientName","orderNumber","timeSlot"]'
  ),
  (
    'consultation_schedule_confirmed',
    'Consult schedule confirmed',
    'consultation',
    'in_app',
    'Consultation confirmed',
    'Your teleconsult for order {{orderNumber}} is confirmed · {{timeSlot}} with {{doctorName}}.',
    '["patientName","orderNumber","timeSlot","doctorName","consultationScheduledAt"]'
  )
ON CONFLICT (code, channel) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template,
  variables = EXCLUDED.variables,
  updated_at = now();
