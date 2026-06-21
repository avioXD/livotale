-- 039: Doctor languages for consultation matching + patient preferred language

BEGIN;

ALTER TABLE clinical.doctors
  ADD COLUMN IF NOT EXISTS languages_known text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE clinical.patients
  ADD COLUMN IF NOT EXISTS preferred_language varchar(80);

CREATE INDEX IF NOT EXISTS idx_doctors_languages_known
  ON clinical.doctors USING gin (languages_known);

COMMIT;
