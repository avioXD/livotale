-- Org operating hours for 45-minute home visit slot generation
CREATE TABLE IF NOT EXISTS operations.org_operating_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_city TEXT NOT NULL DEFAULT 'default',
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME NOT NULL DEFAULT '08:00',
  close_time TIME NOT NULL DEFAULT '18:00',
  slot_duration_minutes SMALLINT NOT NULL DEFAULT 45,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_city, day_of_week)
);

-- Seed default: Sun closed; Mon–Sat 08:00–18:00, 45-min slots
INSERT INTO operations.org_operating_hours (org_city, day_of_week, open_time, close_time, slot_duration_minutes, is_closed)
VALUES
  ('default', 0, '08:00', '18:00', 45, true),
  ('default', 1, '08:00', '18:00', 45, false),
  ('default', 2, '08:00', '18:00', 45, false),
  ('default', 3, '08:00', '18:00', 45, false),
  ('default', 4, '08:00', '18:00', 45, false),
  ('default', 5, '08:00', '18:00', 45, false),
  ('default', 6, '08:00', '18:00', 45, false)
ON CONFLICT (org_city, day_of_week) DO NOTHING;
