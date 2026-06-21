-- 038: Staff/patient in-app notification inbox and async outbox queue.

BEGIN;

CREATE TABLE IF NOT EXISTS audit.inbox_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type text NOT NULL,
  recipient_id text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  body text,
  order_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inbox_notifications_recipient_type_chk
    CHECK (recipient_type IN ('role', 'phone'))
);

CREATE INDEX IF NOT EXISTS idx_inbox_notifications_role
  ON audit.inbox_notifications(recipient_type, recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inbox_notifications_unread
  ON audit.inbox_notifications(recipient_type, recipient_id)
  WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS audit.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  scope text NOT NULL,
  scope_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT notification_outbox_status_chk
    CHECK (status IN ('pending', 'processed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending
  ON audit.notification_outbox(status, created_at)
  WHERE status = 'pending';

COMMIT;
