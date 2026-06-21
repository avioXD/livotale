# Livotale — Liver Care Platform (Monorepo)

Single repository for the Livotale UI, FastAPI backend, and database migrations.

## Structure

```
apps/ui/                 React + Vite frontend (port 5174)
apps/api/                FastAPI backend (port 4001)
packages/database/       SQL migrations
.specify/specs/           Active feature specs, plans, and tasks (Spec Kit)
.specify/docs/           Product catalog, platform guides, and design docs
docker/                  Dockerfiles and postgres init
```

## Quick start (Docker — development)

Use `docker-compose.dev.yml` for local development (hot reload, LocalStack, demo seed):

```bash
# Fresh Postgres volume (first time or reset)
docker compose -f docker-compose.dev.yml down -v

docker compose -f docker-compose.dev.yml up -d postgres redis localstack
docker compose -f docker-compose.dev.yml run --rm db-init
docker compose -f docker-compose.dev.yml run --rm seed-init
docker compose -f docker-compose.dev.yml up api ui nginx

# UI:  http://localhost:3008  (nginx — UI + API consolidated)
#      http://localhost:5174  (Vite direct)
# API: http://localhost:3008/docs   (via nginx)
```

Optional background worker:

```bash
docker compose -f docker-compose.dev.yml --profile full up worker
```

## Quick start (Docker — production)

Default `docker-compose.yml` is the production stack (built images, live `APP_ENV`, worker included):

```bash
cp .env.production.example .env.production   # fill secrets

docker compose --env-file .env.production --profile init run --rm db-init
docker compose --env-file .env.production --profile init run --rm seed-init   # optional first-time bootstrap
docker compose --env-file .env.production up -d --build

# App: http://localhost  (or HTTP_PORT from .env.production)
```

The production stack includes a `db-backup` service that runs daily at `DB_BACKUP_CRON`
and uploads compressed PostgreSQL dumps to `s3://$S3_BUCKET/backub/YYYY/MM/DD/YYYYMMDDTHHMMSSZ/`.
Set `RUN_BACKUP_ON_STARTUP=true` in `.env.production` when you want the service to create
one backup immediately on startup.

## Local development (without Docker for app code)

```bash
# Terminal 1 — infrastructure (dev compose)
docker compose -f docker-compose.dev.yml up -d postgres redis localstack

# Terminal 2 — API
cd apps/api
cp .env.example .env   # set DATABASE_URL to localhost:5433
uv sync
uv run dev             # http://localhost:4001

# Terminal 3 — UI
cd apps/ui
cp .env.example .env
pnpm install
pnpm dev               # http://localhost:5174
```

## Tests

```bash
cd apps/api && uv run pytest
cd apps/ui && pnpm test
cd apps/ui && pnpm test:e2e
```

## Migrations and bootstrap

```bash
# SQL migrations (host)
cd apps/api
DATABASE_URL=postgresql://livotale_user:password@localhost:5433/livotale node scripts/run-migrations.js

# Bootstrap staff, Kolkata service zone, and public packages
cd apps/api && uv run python scripts/seed_project_bootstrap.py

# Or both:
./scripts/dev-bootstrap.sh
```

## Environment

| Variable | Location | Notes |
|----------|----------|-------|
| `APP_ENV` | `apps/api/.env` | `dev` enables demo/dev behavior; any other value uses production/live behavior |
| `VITE_APP_ENV` | `apps/ui/.env` | Set to `dev` to expose frontend dev tools |
| `VITE_API_BASE_URL` | `apps/ui/.env` | Default `http://localhost:4001/api/v1` |
| `DATABASE_URL` | `apps/api/.env` | Host port **5433** for Docker Postgres |

See `LOCAL_CREDENTIALS.md` for demo accounts (gitignored).

## Git branches

- `main` — stable UI history
- `development` — monorepo with API + UI

API history was merged from `bibeksh9/livotale_app` into this repository.
