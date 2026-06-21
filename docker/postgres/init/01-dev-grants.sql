-- Local development: ensure livotale_user can create/alter all objects.
-- POSTGRES_USER is already a superuser in the container; these grants make intent explicit.

ALTER USER livotale_user WITH SUPERUSER CREATEDB CREATEROLE;

GRANT ALL PRIVILEGES ON DATABASE livotale TO livotale_user;
ALTER DATABASE livotale OWNER TO livotale_user;

GRANT ALL ON SCHEMA public TO livotale_user;
ALTER SCHEMA public OWNER TO livotale_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO livotale_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO livotale_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO livotale_user;
