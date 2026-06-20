# Ops Hub Overview — Data Loading

**Status**: Implemented  
**Route**: `/org/:city/admin/operations` (default tab)

## Requirements

1. `GET /admin/operations/overview` loads on mount via `useAsyncData`.
2. Loading state: KPI cards show pulse placeholder; quick actions remain visible and clickable.
3. Error state: `DashboardErrorState` with retry; quick actions remain usable.
4. Success: all six KPI fields render from API response.

## API contract

See `specs/contracts/admin-operations-api.md` — `OperationsOverview` with six numeric fields.

## Verification

- Simulate API failure → error banner + retry works; buttons still navigate.
- Successful load → KPI values match API.
