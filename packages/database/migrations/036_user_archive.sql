-- 036: Staff user archive — status, audit trail, and assignment-check support.

BEGIN;

ALTER TYPE identity.user_status_enum ADD VALUE IF NOT EXISTS 'archived';

ALTER TABLE identity.users
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES identity.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_archived_at
  ON identity.users (archived_at)
  WHERE archived_at IS NOT NULL;

COMMIT;
