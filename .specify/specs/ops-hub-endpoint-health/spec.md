# Ops Hub Endpoint Health

**Status**: Implemented  
**Scope**: Operations hub tabs — Orders, Lab reports, Appointments

## Root cause (2026-06)

Network-style failures on ops tabs were caused by:

1. **Pending migration 047** — SQLAlchemy `ServiceOrder` model references `pathology_external_appointment_id` and visit columns; without migration 047, `/admin/orders` and `/admin/pathology/lab-report-queue` return HTTP 500.
2. **Migration 041 blocked runner** — `CREATE TYPE ... message_template_category_enum` failed when type already existed, preventing later migrations (including 047) from applying via `node scripts/run-migrations.js`.
3. **Wrong API port fallback** — UI defaulted to `localhost:4000` when `VITE_API_BASE_URL` unset; FastAPI dev server uses `4001`.

## Fix

- Idempotent migration 041 (enum + tables + indexes)
- Migration 047 adds pathology portal order ID + visit confirmation columns
- UI default API base → `http://localhost:4001/api/v1`
- API 500 handler surfaces migration hint for missing-column errors

## Endpoints (all require ops/admin JWT)

| Tab | Method | Path |
|-----|--------|------|
| Orders | GET | `/api/v1/admin/orders` |
| Orders filters | GET | `/api/v1/admin/technicians/assignable` |
| Lab reports | GET | `/api/v1/admin/pathology/lab-report-queue` |
| Appointments | GET | `/api/v1/admin/consultations/queue` |
| Overview | GET | `/api/v1/admin/operations/overview` |

## Verification

```bash
cd livotale-apis/api && node scripts/run-migrations.js
INTEGRATIONS_MODE=dummy python -m pytest tests/contract/test_ops_hub_endpoints.py -q
```

## Operator note

If tabs still fail after migrate, confirm API is running on the same port as `VITE_API_BASE_URL` in `livotale-ui/.env`.
