-- 043: Focused SMS test templates with {{variable}} placeholders

BEGIN;

UPDATE integrations.message_templates
SET
  name = 'Patient OTP SMS',
  body_template = 'Hi {{patientName}}, your Livotale verification code is {{otpCode}}. Valid for 10 minutes. Do not share this code.',
  variables = '["patientName","otpCode"]'::jsonb,
  updated_at = now()
WHERE code = 'otp_sent' AND channel = 'sms';

INSERT INTO integrations.message_templates (code, name, category, channel, subject_template, body_template, variables)
VALUES (
  'otp_sent',
  'Patient OTP SMS',
  'otp',
  'sms',
  '',
  'Hi {{patientName}}, your Livotale verification code is {{otpCode}}. Valid for 10 minutes. Do not share this code.',
  '["patientName","otpCode"]'::jsonb
)
ON CONFLICT (code, channel) DO NOTHING;

UPDATE integrations.message_templates
SET
  name = 'Payment link SMS',
  body_template = 'Hi {{patientName}}, pay ₹{{amount}} for Livotale order {{orderNumber}}: {{paymentLink}}',
  variables = '["patientName","orderNumber","amount","paymentLink"]'::jsonb,
  updated_at = now()
WHERE code = 'payment_link_sent' AND channel = 'sms';

INSERT INTO integrations.message_templates (code, name, category, channel, subject_template, body_template, variables)
VALUES (
  'payment_link_sent',
  'Payment link SMS',
  'order',
  'sms',
  '',
  'Hi {{patientName}}, pay ₹{{amount}} for Livotale order {{orderNumber}}: {{paymentLink}}',
  '["patientName","orderNumber","amount","paymentLink"]'::jsonb
)
ON CONFLICT (code, channel) DO NOTHING;

COMMIT;
