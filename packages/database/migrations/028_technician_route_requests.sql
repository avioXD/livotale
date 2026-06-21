-- 028: Technicians request unassigned orders; ops team approves routing

BEGIN;

CREATE TYPE operations.technician_route_request_status_enum AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

CREATE TABLE operations.technician_route_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_collection_id uuid NOT NULL REFERENCES operations.sample_collections(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES operations.technicians(id) ON DELETE CASCADE,
  status operations.technician_route_request_status_enum NOT NULL DEFAULT 'pending',
  request_note text,
  reviewed_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_route_request_pending_per_tech_sample
  ON operations.technician_route_requests (sample_collection_id, technician_id)
  WHERE status = 'pending';

CREATE INDEX idx_route_requests_status ON operations.technician_route_requests(status, requested_at DESC);
CREATE INDEX idx_route_requests_technician ON operations.technician_route_requests(technician_id, requested_at DESC);

CREATE TRIGGER trg_technician_route_requests_updated_at
BEFORE UPDATE ON operations.technician_route_requests
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

COMMIT;
