# API v1 micro-modules

All HTTP routes are mounted at **`/api/v1`** (legacy root mount remains temporarily).

| Micro-module | Category prefix | Example routes |
|--------------|---------------|----------------|
| `identity/` | *(none — resource paths)* | `POST /api/v1/auth/login`, `GET /api/v1/profile`, `PATCH /api/v1/profile/basic` |
| `compliance/` | `/compliance` | `GET /api/v1/compliance/consent/mine`, `POST /api/v1/compliance/consent/accept` |
| `storage/` | `/storage` | `POST /api/v1/storage/upload-url` |
| `commerce/` | `/public` | `POST /api/v1/public/enquiries` |
| `clinical/` | `/doctor`, `/technician` | `GET /api/v1/doctor/consultations/...` |
| `admin/` | `/admin` | `GET /api/v1/admin/dashboard/...` |
| `staff/` | `/staff`, `/technician/profile` | Staff HR self-service |
| `portal/` | `/patient-portal` | Patient OTP & profile |
| `realtime/` | `/notifications`, `/ws/v1` | Inbox + WebSocket channels |

Router implementations live in `app/api/v1/routers/`; this folder groups them by domain for maintainability.
