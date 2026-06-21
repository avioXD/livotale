# Livotale FastAPI Backend

Production-grade FastAPI monolith for the Livotale Liver Care platform with async PostgreSQL, S3 file storage, Redis WebSockets, and ARQ background workers.

## Stack

- **FastAPI** + **uvicorn** (async I/O)
- **SQLAlchemy 2.0** + **asyncpg** (ACID transactions, `SELECT FOR UPDATE`)
- **PostgreSQL** (existing schemas: identity, clinical, operations, commerce, storage, audit, integrations)
- **Redis** (WebSocket pub/sub fan-out, ARQ job queue)
- **S3** / LocalStack (file uploads via pre-signed URLs)
- **uv** (package manager)

## Quick start

```bash
cd livotale_app/api
cp .env.example .env   # set DATABASE_URL with postgresql+asyncpg://
uv sync
uv run dev             # http://localhost:4000
```

OpenAPI docs: http://localhost:4000/docs

## Docker (Postgres + Redis + LocalStack + API)

```bash
# Local Postgres only (port 5433 on host)
docker compose up postgres -d

# Redis + LocalStack + API (uses remote DATABASE_URL unless .env points to localhost:5433)
docker compose up redis localstack api

# Full stack including worker
docker compose --profile full up
```

## Architecture

```
app/
├── api/v1/
│   ├── micro/          # Domain-grouped router registry (identity, compliance, …)
│   └── routers/        # Thin HTTP handlers per resource
├── services/           # Orchestration + transactions
├── repositories/       # SQLAlchemy queries
├── domain/             # State machines (order, pathology, RBAC)
├── models/             # ORM per PostgreSQL schema
├── integrations/       # S3, AI, PDF (dummy|live)
└── workers/            # ARQ: notifications, AI, PDF
```

**Layering:** Routers → Services → Repositories → Models

## Auth

- JWT access tokens (`{ sub, roles, username, exp, iss: livotale-api }`)
- Node-compatible scrypt password verification
- Refresh tokens in `identity.web_sessions`

```http
POST /api/v1/auth/login
{ "identifier": "admin@livotale.com", "password": "Admin@123" }
```

## API versioning

All routes are prefixed with **`/api/v1`**. Domain categories are grouped under `app/api/v1/micro/` (see `micro/README.md`). Consent lives under **`/api/v1/compliance/consent/*`**.

## Key endpoint groups

| Group | Prefix |
|-------|--------|
| Auth | `/auth/*` |
| Public packages | `/public/packages` |
| Public enquiries | `POST /public/enquiries` |
| Admin orders/workflow | `/admin/orders/*` |
| Enquiries CRM | `/admin/enquiries/*` |
| Technician field orders | `/technician/orders/*` |
| Pathology & AI | `/admin/pathology/*`, `/admin/orders/{id}/lab-report` |
| Doctor consultations | `/doctor/consultations/*` |
| Patient portal | `/patient-portal/*` |
| Notifications | `/notifications/inbox` |
| WebSockets | `/ws/v1/notifications`, `/ws/v1/operations/orders/{id}` |

All responses use `{ "data": T }` envelope.

## Order workflow

22-state machine with package guards (PKG-1/2/3), optimistic version locking, and ACID transitions via `SELECT FOR UPDATE`.

## Tests

```bash
uv run pytest
uv run pytest tests/contract/test_recovery_p0.py
uv run python scripts/verify_p0_migrations.py
```

## Database migrations

Apply pending SQL migrations idempotently (uses `audit.schema_migrations` ledger):

```bash
# Existing DB with empty ledger (one-time):
uv run python scripts/bootstrap_migration_ledger.py

# Apply pending migrations (e.g. 039 doctor languages):
uv run python scripts/apply_pending_migrations.py
# or: npm run migrate
```

Full reset (drops all data): `uv run python scripts/reset_database.py`

## Seed demo data (F302)

After migrations, bootstrap Kolkata ops users, service zone, and lab partner:

```bash
cd apps/api
uv run python scripts/seed_project_bootstrap.py
```

Demo logins: `admin@livotale.com` / `Admin@123`, `operations@livotale.com` / `Ops@123`, `technician@livotale.com` / `Tech@123`, `doctor@livotale.com` / `Doctor@123`, `labpartner@livotale.com` / `Lab@123`

Kolkata service zone covers pincodes 700001–700156. Re-running the script is safe (idempotent).

Patient portal OTP (demo): `123456`

```bash
uv run pytest
```
