# Order Payment — Implementation Plan

## Phase 1: Backend

1. Migration `049_platform_payment_settings.sql`
2. Platform settings model + integration service + schemas
3. Patient payment-config endpoint
4. Refactor `mark_portal_payment` (processing + receipt)
5. Verify/reject endpoints
6. Offline receipt wiring
7. Tighten scan/pathology gates

## Phase 2: Frontend

1. Patient pay page (UPI + QR + upload)
2. Ops verify/reject + offline receipt upload
3. Admin payment settings UI
4. Technician payment badge
5. Ops hub processing filter

## Phase 3: Tests

1. API integration test: submit → verify → reject resubmit
2. Frontend service unit tests
