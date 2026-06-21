# Patient Portal Enquiries — Implementation Plan

## Phase 1: Backend

1. `PatientEnquiry` schema + status label helper
2. `list_enquiries` / `get_enquiry` in `patient_portal_service.py`
3. GET routes on patient portal router
4. Integration tests

## Phase 2: Frontend

1. Types + `PatientPortalService` methods
2. `PatientEnquiryCard` component
3. Stacked sections on `PatientOrdersPage`
4. `PatientEnquiryDetailPage` + route
5. Dashboard teaser

## Phase 3: Tests

1. API integration tests
2. Frontend service unit tests
3. `pnpm test` + `pnpm build`
