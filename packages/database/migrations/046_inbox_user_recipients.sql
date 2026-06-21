-- 046: User-scoped inbox recipients and care task notification templates.

BEGIN;

ALTER TABLE audit.inbox_notifications
  DROP CONSTRAINT IF EXISTS inbox_notifications_recipient_type_chk;

ALTER TABLE audit.inbox_notifications
  ADD CONSTRAINT inbox_notifications_recipient_type_chk
  CHECK (recipient_type IN ('role', 'phone', 'user'));

ALTER TABLE audit.inbox_notifications
  ADD COLUMN IF NOT EXISTS trigger_action text;

INSERT INTO integrations.message_templates (code, name, category, channel, subject_template, body_template, variables)
VALUES
  (
    'care_task_assigned',
    'Care task assigned',
    'system',
    'in_app',
    'Care task assigned',
    'Follow-up task for {{patientName}} due {{dueDate}}.',
    '["patientName","dueDate","taskType"]'
  ),
  (
    'care_task_escalation',
    'Care task escalation',
    'system',
    'in_app',
    'Doctor escalation required',
    'Escalation task for {{patientName}}: {{notes}}.',
    '["patientName","notes","taskType"]'
  )
ON CONFLICT (code, channel) DO NOTHING;

COMMIT;
