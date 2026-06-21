# Livotale — Liver Care Platform (Monorepo)

Single repository for the Livotale UI, FastAPI backend, and database migrations.

## Structure

```
apps/ui/                 React + Vite frontend (port 5174)
apps/api/                FastAPI backend (port 4001)
packages/database/       SQL migrations
docs/specs/              Product and platform specs
docs/superpowers/        Design specs and plans
docker/                  Dockerfiles and postgres init
```

## Quick start (Docker)

```bash
# Fresh Postgres volume (first time or reset)
docker compose down -v

docker compose up -d postgres redis localstack
docker compose run --rm db-init
docker compose run --rm seed-init
docker compose up api ui nginx

# Or from host (requires Node + uv):
# ./scripts/dev-bootstrap.sh

# UI:  http://localhost:3008  (nginx — UI + API consolidated)
#      http://localhost:5174  (Vite direct)
# API: http://localhost:4001/docs  (direct)
#      http://localhost:3008/docs   (via nginx)
```

Optional background worker:

```bash
docker compose --profile full up worker
```

## Local development (without Docker for app code)

```bash
# Terminal 1 — infrastructure
docker compose up -d postgres redis localstack

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

# Demo users (admin@livotale.com / Admin@123, etc.)
cd apps/api && uv run python scripts/seed_project_bootstrap.py

# Or both:
./scripts/dev-bootstrap.sh
```

## Environment

| Variable | Location | Notes |
|----------|----------|-------|
| `APP_ENV` | `apps/api/.env` | `development` or `production` |
| `VITE_API_BASE_URL` | `apps/ui/.env` | Default `http://localhost:4001/api/v1` |
| `DATABASE_URL` | `apps/api/.env` | Host port **5433** for Docker Postgres |

See `LOCAL_CREDENTIALS.md` for demo accounts (gitignored).

## Git branches

- `main` — stable UI history
- `development` — monorepo with API + UI

API history was merged from `bibeksh9/livotale_app` into this repository.
