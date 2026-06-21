# F04 — Staff HR, Onboarding & Archive Recovery

**Priority**: P0/P1  
**Gaps**: G-04, G-21

---

## Features

| Area | UI | APIs |
|------|-----|------|
| Self profile | `/staff/profile` | `GET/PATCH /staff/{role}/profile` |
| Technician profile | `/technician/profile` | `/technician/profile` |
| Admin staff hub | `/admin/staff/:roleSlug` | users, org/dashboard, onboard |
| Member detail | `/admin/staff/:role/:memberId` | profile, verify, documents, archive |
| Public onboard | `/staff/onboard/:token` | token attach, submit |

**Role slugs**: doctors, technicians, lab-partners, operations, super-admins, dieticians, health-coaches, pharmacy

---

## P0: archive columns (G-04)

- Apply `036_user_archive.sql`
- Endpoints using `archived_at`: staff user lists, archive-check, archive POST
- **Test**: GET `/admin/staff/doctors/users` → 200

---

## SQL cast fixes (G-21) — verify deployed

Staff profile queries must use:

```sql
CAST(:role AS operations.staff_hr_role_enum)
```

Not `:role::enum` (asyncpg bind conflict).

---

## Required APIs (50+ staff profile routes)

All registered via dynamic `staff_profiles.py` — **exist** if migrations 030–031 applied:

- `operations.staff_hr_profiles`
- `operations.staff_onboarding_invites`
- `operations.staff_hr_documents`

---

## Edge cases

| # | Scenario | Expected |
|---|----------|----------|
| E1 | Archive active user with open appointments | archive-check returns blockers |
| E2 | Archive inactive user | Allowed |
| E3 | Self-archive super admin | Blocked |
| E4 | Onboard expired token | 404/410 |
| E5 | Document upload + admin verify | Status transitions |
| E6 | Technician pincode assignment | PUT pincodes |
| E7 | Multi-role operations+doctor | Separate profile per role slug |

---

## DB tables

| Table | Migration |
|-------|-----------|
| staff_hr_profiles | 030 |
| staff_onboarding_invites | 031 |
| staff_hr_documents | 030 |
| users.archived_at | 036 |
| users.user_badge_id | 037 |

---

## Tests

- Existing: `test_staff_archive.py`, `test_staff_doctors.py`, `test_staff_super_admins.py`
- Add: profile GET for operations role after cast fix
- E2E: admin opens staff hub → user list renders badge IDs
