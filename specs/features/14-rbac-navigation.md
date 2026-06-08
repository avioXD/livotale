# Spec: RBAC, Permissions & UI Screen Map

**Extends**: [010-liver-fibrosis-scan-rbac](../010-liver-fibrosis-scan-rbac/spec.md)

## Roles & mock logins

| Role | Username | Password |
|------|----------|----------|
| Administration | `administration` | `Admin@123` |
| Operations | `operations` | `Ops@123` |
| Technician | `technician` | `Tech@123` |
| Doctor | `doctor` | `Doctor@123` |
| Patient | phone OTP at `/patient/login` | `123456` (dummy) — **separate from staff login** |

## Permission matrix (summary)

| Capability | Admin | Ops | Tech | Doctor | Patient |
|------------|-------|-----|------|--------|---------|
| Enquiries CRUD | ✓ | ✓ | — | — | — |
| Packages CRUD | ✓ | read | — | — | public read |
| Orders CRUD | ✓ | ✓ | assigned read | assigned read | own read |
| Payment mark/link | ✓ | ✓ | — | — | own pay |
| Assign technician | ✓ | ✓ | — | — | — |
| Fibrosis scan capture | ✓ | review | ✓ assigned | read | published only |
| Lab PDF upload | ✓ | ✓ | — | read | — |
| AI extraction review | ✓ | ✓ | — | read | — |
| Final report generate/publish | ✓ | ✓ | — | read | published |
| Assign doctor | ✓ | ✓ | — | — | — |
| Prescription write | ✓ | — | — | ✓ assigned | published |
| Partner lab CRUD | ✓ | read | — | — | — |
| Staff CRUD | ✓ | limited | — | — | — |
| Settings/templates | ✓ | — | — | — | — |
| Audit log | ✓ | — | — | — | — |
| Pricing/financials | ✓ | ✓ | — | — | own order |

## Sidebar (target)

### Administration
- Dashboard
- Enquiries
- Patients
- Orders
- Packages
- Payments
- Partner labs
- Staff (technicians, doctors, operations team)
- Reports & templates
- Prescriptions (oversight)
- Settings & integrations
- Audit log

### Operations
- Dashboard
- Enquiry queue
- Patients
- Orders
- Payments
- Technician assignment
- Uploads (scan / pathology)
- AI review
- Final reports
- Staff (technicians, doctors, labs) — read/assign
- Settings (profile)

### Technician
- Assigned orders
- Scan capture
- Settings

### Doctor
- Consultations
- Patients (assigned)
- Reports
- Prescriptions
- Settings

### Patient (separate shell)
- Dashboard, orders, pay, reports, prescriptions, profile

## Screen inventory (§24 mapping)

All screens listed in requirements §24 are mapped in module specs; this doc is the RBAC gate reference.
