# Order Visit Address — Implementation Plan

## Phase 1: Backend

1. Extend `load_order_visit_location` with `source` and `isComplete`
2. Upsert address in `update_demographics` PATCH
3. Join city name in patient address reads
4. Enrich admin + patient order GET with `visitLocation`
5. Gate `confirm_scan_schedule` on complete address

## Phase 2: Frontend

1. Add `visitLocation` to `LiverCareOrder` type
2. Build `OrderVisitAddressSection` (read/edit + pincode warn)
3. Wire into `OrderScanReviewPanel` and `OrderScanScheduleSection`
4. Patient portal read-only display in `PatientScanScheduleSection`

## Phase 3: Tests

1. API integration: demographics address upsert
2. API integration: confirm schedule blocked without address
3. Unit: `scanSchedule` prerequisites with `hasAddress: false`
4. Component smoke: `OrderVisitAddressSection`
