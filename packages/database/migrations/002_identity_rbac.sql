-- 002: Identity, RBAC, web sessions, and early file metadata.

BEGIN;

CREATE TABLE identity.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(160) NOT NULL,
  mobile varchar(20) UNIQUE,
  email citext UNIQUE,
  password_hash text,
  gender identity.gender_enum NOT NULL DEFAULT 'undisclosed',
  dob date,
  status identity.user_status_enum NOT NULL DEFAULT 'active',
  profile_photo_url text,
  last_login_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_login_contact_chk CHECK (mobile IS NOT NULL OR email IS NOT NULL)
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON identity.users
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE identity.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(60) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(120) NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES identity.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES identity.permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_id)
);

CREATE TABLE identity.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES identity.roles(id) ON DELETE RESTRICT,
  clinic_id uuid,
  is_primary boolean NOT NULL DEFAULT false,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id, clinic_id),
  CONSTRAINT user_roles_active_window_chk CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX uq_user_roles_primary
ON identity.user_roles(user_id)
WHERE is_primary = true AND ends_at IS NULL;

CREATE TABLE identity.web_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL UNIQUE,
  ip_address inet,
  user_agent text,
  status identity.session_status_enum NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE storage.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  file_type storage.file_type_enum NOT NULL,
  file_name varchar(255) NOT NULL,
  mime_type varchar(120) NOT NULL,
  storage_url text NOT NULL,
  file_size_bytes bigint,
  checksum varchar(128),
  uploaded_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT files_size_chk CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0)
);

CREATE UNIQUE INDEX uq_files_checksum
ON storage.files(checksum)
WHERE checksum IS NOT NULL;

COMMIT;
