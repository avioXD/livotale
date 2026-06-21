-- 035: Service zones for operations / technician coverage areas.

BEGIN;

CREATE TABLE IF NOT EXISTS operations.service_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name varchar(120) NOT NULL,
  state_name varchar(80) NOT NULL,
  pincodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_service_zones_updated_at
BEFORE UPDATE ON operations.service_zones
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_service_zones_active ON operations.service_zones(active) WHERE active = true;

COMMIT;
