-- 031: Staff onboarding invites — admin provision, self-register, inactive until verified

BEGIN;

CREATE TABLE operations.staff_onboarding_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token varchar(64) NOT NULL UNIQUE,
  role_key varchar(40) NOT NULL,
  full_name varchar(200) NOT NULL,
  email varchar(200),
  mobile varchar(20) NOT NULL,
  username varchar(80),
  member_id uuid,
  user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  status varchar(40) NOT NULL DEFAULT 'invited',
  profile_complete boolean NOT NULL DEFAULT false,
  verification_status varchar(40) NOT NULL DEFAULT 'pending',
  employment_status varchar(40) NOT NULL DEFAULT 'inactive',
  onboarding_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  link_sent_at timestamptz,
  registered_at timestamptz,
  profile_submitted_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_onboarding_invites_mobile ON operations.staff_onboarding_invites(mobile);
CREATE INDEX idx_staff_onboarding_invites_user ON operations.staff_onboarding_invites(user_id);

CREATE TRIGGER trg_staff_onboarding_invites_updated_at
BEFORE UPDATE ON operations.staff_onboarding_invites
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

COMMIT;
