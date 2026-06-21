-- 036: Indexes for filtering activity and login audit logs.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_activity_logs_action_date
  ON audit.activity_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
  ON audit.activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_logs_success_date
  ON identity.login_logs(success, created_at DESC);

COMMIT;
