-- 024: Admin ops, reminder logs, tele sessions, notification templates (007 Phase 5)

BEGIN;

CREATE TYPE operations.appointment_reminder_type_enum AS ENUM ('24h', '2h', '15m', 'custom');
CREATE TYPE operations.appointment_reminder_delivery_enum AS ENUM ('queued', 'sent', 'delivered', 'failed', 'skipped');

CREATE TABLE operations.appointment_reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES operations.appointments(id) ON DELETE CASCADE,
  reminder_type operations.appointment_reminder_type_enum NOT NULL,
  channel core.notification_channel_enum NOT NULL DEFAULT 'in_app',
  recipient_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  template_code varchar(80) NOT NULL,
  status operations.appointment_reminder_delivery_enum NOT NULL DEFAULT 'queued',
  notification_id uuid REFERENCES core.notifications(id) ON DELETE SET NULL,
  sent_at timestamptz,
  delivery_status varchar(40),
  retry_count int NOT NULL DEFAULT 0,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_reminder_logs_retry_chk CHECK (retry_count >= 0)
);

CREATE UNIQUE INDEX uq_appointment_reminder_once
  ON operations.appointment_reminder_logs(appointment_id, reminder_type, channel);

CREATE INDEX idx_appointment_reminder_logs_appt
  ON operations.appointment_reminder_logs(appointment_id, created_at DESC);

CREATE TABLE operations.appointment_notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  channel core.notification_channel_enum NOT NULL DEFAULT 'in_app',
  subject_template text NOT NULL,
  body_template text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_appointment_notification_templates_updated_at
BEFORE UPDATE ON operations.appointment_notification_templates
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE operations.clinic_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(160) NOT NULL,
  holiday_type varchar(40) NOT NULL DEFAULT 'clinic',
  start_date date NOT NULL,
  end_date date NOT NULL,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  reason text,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinic_holidays_date_chk CHECK (end_date >= start_date)
);

CREATE INDEX idx_clinic_holidays_dates ON operations.clinic_holidays(start_date, end_date);

CREATE TABLE operations.booking_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL,
  appointment_type_id uuid REFERENCES operations.appointment_types(id) ON DELETE CASCADE,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  cancellation_window_hours int,
  reschedule_window_hours int,
  max_reschedules int,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_booking_policies_updated_at
BEFORE UPDATE ON operations.booking_policies
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE operations.teleconsultation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES operations.appointments(id) ON DELETE CASCADE,
  meeting_url text NOT NULL,
  meeting_provider varchar(40) NOT NULL DEFAULT 'livotale',
  patient_joined_at timestamptz,
  doctor_joined_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  recording_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_teleconsultation_sessions_updated_at
BEFORE UPDATE ON operations.teleconsultation_sessions
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

INSERT INTO operations.appointment_notification_templates(code, name, channel, subject_template, body_template)
VALUES
  (
    'appointment_reminder_24h',
    'Appointment reminder 24h',
    'in_app',
    'Reminder: {{typeName}} tomorrow',
    'Your {{typeName}} is scheduled for {{scheduledAt}}. Please confirm or reschedule if needed.'
  ),
  (
    'appointment_reminder_2h',
    'Appointment reminder 2h',
    'in_app',
    'Reminder: {{typeName}} in 2 hours',
    'Your {{typeName}} starts at {{scheduledAt}}.'
  ),
  (
    'appointment_reminder_15m',
    'Appointment reminder 15m',
    'in_app',
    'Starting soon: {{typeName}}',
    'Your {{typeName}} begins in 15 minutes.'
  ),
  (
    'appointment_staff_assigned',
    'Staff assigned',
    'in_app',
    'Staff assigned to your appointment',
    'Your {{typeName}} on {{scheduledAt}} has been updated with assigned staff.'
  ),
  (
    'appointment_manual_reminder',
    'Manual reminder',
    'in_app',
    'Appointment reminder',
    'Reminder for your {{typeName}} on {{scheduledAt}}.'
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template;

COMMIT;
