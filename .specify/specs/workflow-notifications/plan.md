# Workflow Notifications — Implementation Plan

## Phase 1: Spec + helper

1. `spec.md`, `plan.md`, `tasks.md` (this folder)
2. `order_workflow_notifications.py` — `notify_order_trigger()`, user resolution, package-flag guards
3. Extend `ROLE_TARGETS` in `workflow_notifications.py`

## Phase 2: Wire triggers (N1–N14)

1. `order_service.py` — N1 `enquiry_converted` in `EVENT_NOTIFICATION_MAP`
2. `technician_order_service.py` — N2 `scan_started`, N4 `sample_dispatch_pending`
3. `technician_order_service.py` — N3 `scan_reviewed`
4. `pathology_service.py` — N5–N8
5. `ai_extraction_service.py` — N9–N11
6. `final_report_service.py` — N12
7. `consultation_service.py` — N13
8. `prescription_service.py` — N14

## Phase 3: Tests

1. Extend `test_scan_notifications.py`
2. Add `test_pathology_notifications.py`
3. Add `test_report_ai_notifications.py`
4. Extend `test_consult_notifications.py`

## Phase 4: Verification

1. `pnpm test` (API integration)
2. Manual checklist spot-check (rows 3, 8, 9, 14, 18, 19 minimum)
