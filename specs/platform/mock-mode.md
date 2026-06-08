# Feature Specification: Frontend Mock Mode

**Feature**: `011-mock-mode` | **Status**: Implemented

## Objective

Run the full Livotale UI without a backend. All service methods keep their API endpoint signatures; when `VITE_MOCK_MODE=true`, handlers read/write in-memory mock data instead of HTTP.

## Configuration

```env
VITE_MOCK_MODE=true
VITE_API_BASE_URL=http://localhost:4001   # ignored in mock mode
```

Restart the Vite dev server after changing env vars.

## Architecture

See also [`src/services/README.md`](../../src/services/README.md).

| Layer | Path | Role |
|-------|------|------|
| Toggle | `src/services/mock/mockConfig.ts` | `isMockMode()` from `VITE_MOCK_MODE` |
| Router | `src/services/mock/mockOrApi.ts` | `mockOrApi(mockFn, apiFn)` on every service method |
| Base | `src/services/base/BaseApiService.ts` | HTTP client — API paths in service classes |
| Session | `src/services/mock/mockSession.ts` | Current mock user after login |
| Data | `src/services/<domain>/*.mock.ts` | Seed data + mutable in-memory state |

## Mock accounts (`auth.mock.ts`) — staff only

| Login | Password | Role |
|-------|----------|------|
| `administration` | `Admin@123` | Administration (Super Admin) |
| `operations` | `Ops@123` | Operations |
| `technician` | `Tech@123` | Technician |
| `doctor` | `Doctor@123` | Doctor |

Patient self-registration is disabled in mock mode. Patients are created by Operations during booking.

Seed patient record id: `00000000-0000-4000-8000-000000000201` (Rohan Mehta).

## Service mock files

- `auth/auth.mock.ts`
- `patients/patients.mock.ts`, `patients/dashboard.mock.ts`
- `appointments/*.mock.ts` (patient, doctor, admin, technician)
- `journey/journey.mock.ts`
- `reports/reports.mock.ts`
- `profile/profile.mock.ts`
- `admin/adminOperations.mock.ts`
- `sampleCollection/*.mock.ts`
- `staff/*.mock.ts`
- `technician/technicianProfile.mock.ts`
- `opsAnalytics/opsAnalytics.mock.ts`

## Mutations

Forms and actions update local mock state (book appointment, assign technician, collect payment, profile edits, etc.). Data resets on full page reload except auth persisted in `localStorage` (zustand).

## Liver care mock services

Additional mocks under `src/services/liverCare/*.mock.ts` and `src/services/notifications/` for orders, pathology, patient portal, and push inbox.

## Related specs

- [features/](../features/) — product requirements
- [features/15-dummy-services.md](../features/15-dummy-services.md) — external service interfaces
