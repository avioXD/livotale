# F05 — Doctor Languages & Consultation Matching

**Priority**: P1  
**Migration**: `039_doctor_languages.sql`

---

## Purpose

Doctors can speak multiple languages. Operations filters the doctor roster by language when assigning a hepatologist to a Liver Care order. Patient preferred language (when set) pre-fills the filter.

---

## Database

| Table | Column | Type |
|-------|--------|------|
| `clinical.doctors` | `languages_known` | `text[] NOT NULL DEFAULT '{}'` |
| `clinical.patients` | `preferred_language` | `varchar(80)` |

Index: `clinical.idx_doctors_languages_known` (GIN on `languages_known`).

---

## APIs

### `GET /admin/doctors`

Returns roster for assignment UIs.

**Response** (per doctor):

```json
{
  "id": "uuid",
  "userId": "uuid",
  "fullName": "Dr. Name",
  "specialization": "Hepatology",
  "qualification": "DM MD",
  "registrationNumber": "MMC-123",
  "clinicName": "Kolkata Clinic",
  "languagesKnown": ["English", "Hindi", "Bengali"],
  "status": "active"
}
```

**Query params**

| Param | Description |
|-------|-------------|
| `language` | Optional. Returns only doctors where `language = ANY(languages_known)` |

### Staff profile

- `PATCH /admin/staff/doctors/{memberId}/profile` with `{ "meta": { "languagesKnown": ["Hindi", "English"] } }`
- Syncs to `clinical.doctors.languages_known` via `staff_profile_service._sync_doctor_clinical`

### Orders

- Order payload includes `patientPreferredLanguage` when `clinical.patients.preferred_language` is set.

---

## UI

| Surface | Behavior |
|---------|----------|
| Staff → Doctor → Profile | Multi-select language chips (`DOCTOR_LANGUAGES` constant) |
| Order → Consultation | Language filter dropdown; shows languages on doctor cards |
| Staff hub doctor list | Languages column in metrics |

---

## Supported languages

English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, Urdu.

Defined in [`livotale-ui/src/app/config/doctorLanguages.ts`](../../../src/app/config/doctorLanguages.ts).

---

## Migration apply (idempotent)

```bash
cd livotale-apis/api

# If DB existed before ledger (audit.schema_migrations empty):
uv run python scripts/bootstrap_migration_ledger.py

# Apply any pending migrations (e.g. 039):
uv run python scripts/apply_pending_migrations.py
# or: npm run migrate

# Verify:
uv run python scripts/verify_p0_migrations.py
```

**Do not** run `bootstrap_migration_ledger.py` on a fresh empty database — use `apply_pending_migrations.py` instead.

---

## Tests

- `tests/test_doctor_languages.py` — profile PATCH + roster filter
- `tests/test_doctor_availability.py` — schedule CRUD (unchanged by languages)

---

## Failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| CORS error on `/admin/doctors` | 500 from missing `languages_known` column | Apply migration 039 |
| Schedule tab blank | Parent page `Promise.all` failed on doctors fetch | Fixed: lazy fetch + `allSettled` |
| Ledger re-applies 001 on populated DB | Empty `audit.schema_migrations` | Run `bootstrap_migration_ledger.py` once |
