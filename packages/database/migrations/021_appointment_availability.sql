-- 021: Doctor availability, holidays, slots, internal notes (007 Phase 2)

BEGIN;

CREATE TABLE operations.doctor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES clinical.doctors(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_minutes int NOT NULL DEFAULT 30,
  buffer_minutes int NOT NULL DEFAULT 0,
  max_appointments_per_day int,
  visit_modes jsonb NOT NULL DEFAULT '["clinic","tele"]'::jsonb,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doctor_availability_time_chk CHECK (end_time > start_time),
  CONSTRAINT doctor_availability_duration_chk CHECK (slot_duration_minutes > 0)
);

CREATE TRIGGER trg_doctor_availability_updated_at
BEFORE UPDATE ON operations.doctor_availability
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE INDEX idx_doctor_availability_doctor
  ON operations.doctor_availability(doctor_id, day_of_week)
  WHERE is_active = true;

CREATE TABLE operations.doctor_availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES clinical.doctors(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  is_blocked boolean NOT NULL DEFAULT true,
  start_time time,
  end_time time,
  reason text,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doctor_availability_exceptions_time_chk CHECK (
    (start_time IS NULL AND end_time IS NULL)
    OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

CREATE INDEX idx_doctor_availability_exceptions_doctor_date
  ON operations.doctor_availability_exceptions(doctor_id, exception_date);

CREATE TABLE operations.doctor_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES clinical.doctors(id) ON DELETE CASCADE,
  title varchar(160) NOT NULL,
  holiday_type varchar(40) NOT NULL DEFAULT 'leave',
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doctor_holidays_date_chk CHECK (end_date >= start_date)
);

CREATE INDEX idx_doctor_holidays_doctor_dates
  ON operations.doctor_holidays(doctor_id, start_date, end_date);

CREATE TABLE operations.appointment_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_type operations.appointment_slot_type_enum NOT NULL DEFAULT 'clinic',
  status operations.appointment_slot_status_enum NOT NULL DEFAULT 'open',
  max_bookings int NOT NULL DEFAULT 1,
  current_bookings int NOT NULL DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  block_reason text,
  appointment_type_id uuid REFERENCES operations.appointment_types(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_slots_time_chk CHECK (end_time > start_time),
  CONSTRAINT appointment_slots_bookings_chk CHECK (current_bookings >= 0 AND max_bookings > 0)
);

CREATE TRIGGER trg_appointment_slots_updated_at
BEFORE UPDATE ON operations.appointment_slots
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE UNIQUE INDEX idx_appointment_slots_doctor_unique
  ON operations.appointment_slots(doctor_id, slot_date, start_time, slot_type)
  WHERE doctor_id IS NOT NULL AND is_blocked = false;

CREATE INDEX idx_appointment_slots_doctor_date
  ON operations.appointment_slots(doctor_id, slot_date)
  WHERE doctor_id IS NOT NULL;

CREATE TABLE operations.appointment_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES operations.appointments(id) ON DELETE CASCADE,
  author_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointment_internal_notes_appt
  ON operations.appointment_internal_notes(appointment_id, created_at DESC);

COMMIT;
