# Database Migration Baseline

**Target DB**: PostgreSQL on `localhost:5433`, database `livotale`  
**Apply tool**: `apps/api/scripts/reset_database.py` (full reset) or sequential SQL apply

---

## Required migration order (liver-care + recovery)

```
001 → … → 032_liver_care_platform_core
033_liver_care_pathology_ai_reports
034_enquiry_crm_order_extensions      ← enquiries.order_outcome
034_liver_care_clinical_pipeline      ← fibrosis_scan_records, sample_dispatches
035_service_zones
036_user_archive                      ← users.archived_at
036_activity_log_audit_indexes
037_user_badge_id
038_inbox_notifications               ← audit.inbox_notifications, notification_outbox
039_doctor_languages                  ← clinical.doctors.languages_known, patients.preferred_language
```

**Note**: Two files share prefix `034_` and `036_`. Run **both** of each number; alphabetical order runs enquiry before clinical pipeline.

---

## Idempotent apply (existing databases)

If the database was migrated before the ledger existed (`audit.schema_migrations` is empty):

```bash
cd livotale-apis/api
uv run python scripts/bootstrap_migration_ledger.py   # records applied files, no SQL
uv run python scripts/apply_pending_migrations.py     # applies only pending (e.g. 039)
# or: npm run migrate
uv run python scripts/verify_p0_migrations.py
```

Do **not** run `bootstrap_migration_ledger.py` on a fresh empty database.

---

## Verification SQL (run after apply)

```sql
-- P0 columns
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'operations' AND table_name = 'enquiries'
  AND column_name IN ('order_outcome', 'order_outcome_remarks');

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'identity' AND table_name = 'users'
  AND column_name IN ('archived_at', 'archived_by', 'user_badge_id');

-- P0 tables
SELECT to_regclass('audit.inbox_notifications');
SELECT to_regclass('audit.notification_outbox');

-- Doctor languages (039)
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'clinical' AND table_name = 'doctors'
  AND column_name = 'languages_known';
SELECT to_regclass('clinical.idx_doctors_languages_known');
```

All queries must return rows / non-null regclass.

---

## Schema inventory (10 schemas, ~155 tables)

| Schema | Purpose | Liver-care critical tables |
|--------|---------|---------------------------|
| identity | Auth, RBAC, sessions | users, user_roles, web_sessions |
| core | Cities, legacy packages | cities, care_packages |
| clinical | Patients, scans, reports | patients, fibrosis_scan_records, final_reports, order_consultations |
| operations | Enquiries, staff, zones | enquiries, enquiry_follow_up_logs, lab_partners, service_zones, sample_dispatches |
| commerce | Orders, payments | liver_care_packages, service_orders, order_payments, payment_links |
| integrations | AI jobs, lab uploads | lab_report_uploads, ai_extraction_jobs, extracted_fields |
| audit | Compliance, inbox | inbox_notifications, notification_outbox, audit_logs, activity_logs |
| storage | S3 file metadata | files |
| care | Legacy care team | care_team_members, consultations |
| ai | Legacy AI assessments | ai_assessments |

Full model coverage: only **32/155** tables have SQLAlchemy models; remainder accessed via raw SQL in services.

---

## Idempotent seed rules (no duplicate data)

Applies to `seed_project_bootstrap.py` and any new seed scripts:

1. **Users**: upsert by `email` or `username`; skip insert if active row exists.
2. **Roles**: insert with `ON CONFLICT DO NOTHING` on role code.
3. **Packages**: seed only when `liver_care_packages` count = 0 (`seed_packages_if_empty` pattern).
4. **Inbox notifications**: do not seed duplicates — check `(recipient_type, recipient_id, title, created_at::date)` before insert.
5. **Enquiries/orders**: test seeds use fixed UUIDs; production seeds must use existence checks.

**Required pattern for new seed entries**:

```python
existing = await db.execute(text("SELECT 1 FROM ... WHERE unique_key = :k"), {"k": key})
if existing.scalar():
    return  # skip
# INSERT ...
```

---

## Dev onboarding checklist

```bash
cd livotale-apis/api
docker compose up postgres -d
PYTHONPATH=. uv run python scripts/reset_database.py   # OR apply 034–038 only
PYTHONPATH=. uv run python scripts/seed_project_bootstrap.py
uv run uvicorn app.main:app --reload --port 4000
```

Document in `LOCAL_CREDENTIALS.md`: migrations 032–038 are mandatory for staff dashboard.

---

## Known structural debt

| Issue | Risk | Remediation (later) |
|-------|------|---------------------|
| Duplicate `034_*` files | Confusion | Merge into single 034 in future major migration |
| `audit_log` vs `audit_logs` | Orphan table | Drop `audit_log` or migrate data |
| `fibroscan_results` vs `fibrosis_scan_records` | Dual scan models | Document; retire legacy |
| Stale `database/README.md` | Dev error | Update to list 014–038 |
