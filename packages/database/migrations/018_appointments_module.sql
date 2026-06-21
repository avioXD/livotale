-- 018: Appointments module — booking notes, time slots, status timeline.

BEGIN;

ALTER TABLE operations.home_visits
  ADD COLUMN IF NOT EXISTS patient_notes text,
  ADD COLUMN IF NOT EXISTS preferred_time_slot varchar(20);

CREATE TABLE IF NOT EXISTS operations.appointment_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES operations.home_visits(id) ON DELETE CASCADE,
  status operations.visit_status_enum NOT NULL,
  step_code varchar(80),
  title varchar(160) NOT NULL,
  description text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_role varchar(40),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointment_status_events_visit
  ON operations.appointment_status_events(visit_id, occurred_at ASC);

COMMIT;
