-- 037: Human-readable Livotale user badge IDs (e.g. LVT-67997AD).

BEGIN;

ALTER TABLE identity.users
  ADD COLUMN IF NOT EXISTS user_badge_id varchar(12);

CREATE OR REPLACE FUNCTION identity.generate_user_badge_id(user_uuid uuid)
RETURNS varchar(12)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'LVT-' || UPPER(SUBSTRING(REPLACE(user_uuid::text, '-', '') FROM 1 FOR 7));
$$;

UPDATE identity.users
SET user_badge_id = identity.generate_user_badge_id(id)
WHERE user_badge_id IS NULL OR user_badge_id = '';

ALTER TABLE identity.users
  ALTER COLUMN user_badge_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_badge_id
  ON identity.users(user_badge_id);

CREATE OR REPLACE FUNCTION identity.set_user_badge_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_badge_id IS NULL OR NEW.user_badge_id = '' THEN
    NEW.user_badge_id := identity.generate_user_badge_id(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_badge_id ON identity.users;
CREATE TRIGGER trg_users_badge_id
BEFORE INSERT ON identity.users
FOR EACH ROW
EXECUTE FUNCTION identity.set_user_badge_id();

COMMENT ON COLUMN identity.users.user_badge_id IS
  'Public-facing Livotale user badge shown in staff lists and profiles (LVT-XXXXXXX).';
COMMENT ON COLUMN identity.users.metadata IS
  'Extensible JSON for integrations; not used for core auth. Prefer user_badge_id for display IDs.';

COMMIT;
