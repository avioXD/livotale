-- 014: Username-based authentication support.

BEGIN;

ALTER TABLE identity.users
  ADD COLUMN IF NOT EXISTS username citext;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username
ON identity.users(username)
WHERE username IS NOT NULL;

COMMIT;
