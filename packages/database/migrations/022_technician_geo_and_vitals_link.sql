-- 022: Technician geo tracking + appointment links on field vitals (007 Phase 3)

BEGIN;

CREATE TYPE operations.geo_source_enum AS ENUM ('manual', 'gps');

CREATE TABLE operations.technician_geo_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES operations.appointments(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES operations.technicians(id) ON DELETE CASCADE,
  latitude numeric(10, 7) NOT NULL,
  longitude numeric(10, 7) NOT NULL,
  accuracy_m numeric(8, 2),
  source operations.geo_source_enum NOT NULL DEFAULT 'gps',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT technician_geo_lat_chk CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT technician_geo_lng_chk CHECK (longitude >= -180 AND longitude <= 180)
);

CREATE INDEX idx_technician_geo_appointment_recorded
  ON operations.technician_geo_locations(appointment_id, recorded_at DESC);

CREATE INDEX idx_technician_geo_technician_recorded
  ON operations.technician_geo_locations(technician_id, recorded_at DESC);

ALTER TABLE operations.visit_vitals
  ADD COLUMN IF NOT EXISTS appointment_id uuid
    REFERENCES operations.appointments(id) ON DELETE SET NULL;

UPDATE operations.visit_vitals vv
SET appointment_id = hv.appointment_id
FROM operations.home_visits hv
WHERE hv.id = vv.visit_id
  AND vv.appointment_id IS NULL
  AND hv.appointment_id IS NOT NULL;

COMMIT;
