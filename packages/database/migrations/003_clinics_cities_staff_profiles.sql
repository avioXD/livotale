-- 003: Geography, clinics, and staff profile tables.

BEGIN;

CREATE TABLE core.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  state varchar(120) NOT NULL,
  country varchar(80) NOT NULL DEFAULT 'India',
  timezone varchar(80) NOT NULL DEFAULT 'Asia/Kolkata',
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, state, country)
);

CREATE TABLE core.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(180) NOT NULL,
  registration_number varchar(120),
  gst_number varchar(30),
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  address text,
  contact_number varchar(20),
  email citext,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_clinics_registration_number
ON core.clinics(registration_number)
WHERE registration_number IS NOT NULL;

CREATE TRIGGER trg_clinics_updated_at
BEFORE UPDATE ON core.clinics
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE identity.user_roles
  ADD CONSTRAINT fk_user_roles_clinic
  FOREIGN KEY (clinic_id) REFERENCES core.clinics(id) ON DELETE SET NULL;

CREATE TABLE core.clinic_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES core.clinics(id) ON DELETE CASCADE,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  label varchar(120) NOT NULL,
  line1 text NOT NULL,
  line2 text,
  pincode varchar(12),
  latitude numeric(10,7),
  longitude numeric(10,7),
  contact_number varchar(20),
  is_primary boolean NOT NULL DEFAULT false,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_clinic_locations_primary
ON core.clinic_locations(clinic_id)
WHERE is_primary = true;

CREATE TABLE identity.staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES identity.users(id) ON DELETE CASCADE,
  employee_code varchar(60) UNIQUE,
  clinic_id uuid REFERENCES core.clinics(id) ON DELETE SET NULL,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  designation varchar(120),
  joined_on date,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_staff_profiles_updated_at
BEFORE UPDATE ON identity.staff_profiles
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE clinical.doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES identity.users(id) ON DELETE CASCADE,
  clinic_id uuid REFERENCES core.clinics(id) ON DELETE SET NULL,
  registration_number varchar(120) NOT NULL UNIQUE,
  qualification varchar(180),
  specialization varchar(160),
  years_experience int,
  digital_signature_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  status core.record_status_enum NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doctors_experience_chk CHECK (years_experience IS NULL OR years_experience >= 0)
);

CREATE TRIGGER trg_doctors_updated_at
BEFORE UPDATE ON clinical.doctors
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE operations.technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES identity.users(id) ON DELETE CASCADE,
  employee_code varchar(60) NOT NULL UNIQUE,
  clinic_id uuid REFERENCES core.clinics(id) ON DELETE SET NULL,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  verification_status operations.verification_status_enum NOT NULL DEFAULT 'pending',
  status operations.staff_availability_enum NOT NULL DEFAULT 'available',
  rating numeric(3,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT technicians_rating_chk CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))
);

CREATE TRIGGER trg_technicians_updated_at
BEFORE UPDATE ON operations.technicians
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE care.care_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES identity.users(id) ON DELETE CASCADE,
  member_type care.member_type_enum NOT NULL,
  clinic_id uuid REFERENCES core.clinics(id) ON DELETE SET NULL,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  rating numeric(3,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT care_team_rating_chk CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))
);

CREATE TRIGGER trg_care_team_members_updated_at
BEFORE UPDATE ON care.care_team_members
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE operations.lab_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(180) NOT NULL,
  contact_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  clinic_id uuid REFERENCES core.clinics(id) ON DELETE SET NULL,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  registration_number varchar(120),
  contact_number varchar(20),
  email citext,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_lab_partners_updated_at
BEFORE UPDATE ON operations.lab_partners
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE commerce.pharmacy_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES identity.users(id) ON DELETE CASCADE,
  clinic_id uuid REFERENCES core.clinics(id) ON DELETE SET NULL,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  license_number varchar(120),
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_pharmacy_profiles_updated_at
BEFORE UPDATE ON commerce.pharmacy_profiles
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

COMMIT;
