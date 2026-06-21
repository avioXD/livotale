# Workflow Notifications

**Status**: Implemented  
**Scope**: Full Liver Care order workflow — in-app inbox + WebSocket realtime  
**Extends**: [assignment-notifications/spec.md](../assignment-notifications/spec.md) (S1–S9 already implemented)

## Goal

Every workflow action or status update notifies the correct recipient(s) via in-app inbox + WebSocket. Role broadcasts go to ops/admin; user-specific notifications go to assigned patient (phone), doctor, or technician.

**Delivery**: In-app + WebSocket only (no SMS/email/native push in this spec).

## Recipient model

Same as assignment-notifications:

| recipient_type | recipient_id | Use |
|----------------|--------------|-----|
| `role` | API role code (`support`, `technician`, …) | Broadcast to staff with that role |
| `phone` | Normalized patient phone | Patient portal inbox |
| `user` | `identity.users.id` | Assigned individual only |

**Role broadcast defaults**: `OPERATIONS`, `CITY_MANAGER`, `SUPER_ADMIN`  
**Admin-only triggers**: also notify `CITY_MANAGER`, `SUPER_ADMIN` where noted

## Scenarios — already implemented (regression only)

| Trigger | When | Recipients |
|---------|------|------------|
| `enquiry_received` | Public enquiry created | Ops, Admin |
| `enquiry_assigned` | Ops assigns executive | Assigned user (S1–S2) |
| `order_created` | Order submitted | Ops, Patient |
| `payment_link_sent` | Ops sends payment link | Patient |
| `payment_submitted` / `payment_completed` / `payment_rejected` / `payment_failed` | Payment lifecycle | Ops (+ Patient where applicable) |
| `scan_date_requested` | Patient submits scan preference | Ops |
| `scan_schedule_confirmed` / `technician_visit_assigned` | Ops confirms scan (S3–S4) | Patient, Tech user |
| `technician_assigned` / `scan_scheduled` | Legacy assign/schedule (S5) | Tech user, Patient |
| `visit_started` / `visit_reached` / `scan_completed` | Technician field visit | Ops (+ Patient on complete) |
| `lab_assigned` | Partner lab assigned (S7) | Ops, Tech user |
| `consultation_date_requested` | Patient submits consult preference | Ops |
| `consultation_schedule_confirmed` / `doctor_assigned` / `consultation_scheduled` | Consult scheduling (S6) | Patient, Doctor user |
| `final_report_published` | Report published to patient | Patient, Ops |
| `care_task_assigned` / `care_task_escalation` | Care tasks (S8–S9) | Assigned user / Doctor role |

## Scenarios — this spec (N1–N14)

| ID | Trigger | When / actor | Recipients | Backend hook |
|----|---------|--------------|------------|--------------|
| N1 | `enquiry_converted` | Enquiry → order create | Ops + Patient | `order_service.create()` |
| N2 | `scan_started` | Tech marks reached → `START_SCAN` | Ops | `technician_order_service.mark_reached()` |
| N3 | `scan_reviewed` | Ops reviews scan KPIs | Doctor user (consultation package only) | `technician_order_service.ops_review_scan()` |
| N4 | `sample_dispatch_pending` | Scan completed + pathology package | Tech user + Ops | `technician_order_service.complete_scan()` |
| N5 | `sample_dispatched` | Tech/Ops dispatches sample | Ops + Admin | `pathology_service.dispatch_sample()`, `technician_submit_sample_to_lab()` |
| N6 | `sample_received_at_lab` | Ops confirms lab receipt | Ops | `pathology_service.mark_received_at_lab()` |
| N7 | `awaiting_lab_report` | Ops marks awaiting PDF | Ops | `pathology_service.mark_awaiting_report()` |
| N8 | `lab_report_uploaded` | Ops uploads lab PDF | Ops + Doctor (consultation package) | `pathology_service.upload_lab_report_multipart()` |
| N9 | `ai_extraction_ready` | AI fields saved | Ops | `ai_extraction_service` after `TRIGGER_AI` |
| N10 | `ai_reupload_required` | Ops requests reupload | Ops + Tech user | `ai_extraction_service.request_reupload()` |
| N11 | `ai_verified` | Ops verifies extraction | Ops + Doctor (consultation package) | `ai_extraction_service.verify_extraction()` |
| N12 | `final_report_generated` | Ops generates letterhead | Ops + Admin | `final_report_service.generate()` |
| N13 | `consultation_completed` | Doctor completes visit | Ops | `consultation_service.complete_visit()` |
| N14 | `prescription_published` | Doctor publishes Rx | Patient + Ops | `prescription_service.publish()` |
| N15 | `patient_intake_verified` | Operator/tech OTP intake commit | Ops + Patient (verified phone) | `technician_order_service._verify_and_commit_intake()` |

## Edge cases

- Skip pathology triggers (N4–N8) when package `pathology_included = false`.
- Skip doctor triggers (N3, N8, N11) when package has no consultation step.
- Skip user notification when technician/doctor assignee is null.
- `enquiry_converted` fires only when order is created from an enquiry (`enquiry_id` set).
- Assignment reassign no-op rules from assignment-notifications still apply.
- Dual scan scheduling paths (`confirm_scan_schedule` vs `schedule_scan`) emit different patient triggers — unchanged.

## Delivery pipeline

```
notify_order_trigger() → WorkflowNotificationService.order_event()
  → NotificationDispatchService.dispatch (in_app)
  → process_pending_outbox → push_inbox → Redis ws:*
```

## Manual test checklist

| # | Action | Login as | Expect trigger |
|---|--------|----------|----------------|
| 1 | Public enquiry submit | Ops | `enquiry_received` |
| 2 | Assign enquiry executive | Assignee ops | `enquiry_assigned` |
| 3 | Convert enquiry → order | Ops + Patient | `enquiry_converted`, `order_created` |
| 4 | Send payment link | Patient portal | `payment_link_sent` |
| 5 | Patient pays / ops verifies | Ops + Patient | `payment_completed` |
| 6 | Patient requests scan date | Ops | `scan_date_requested` |
| 7 | Ops confirms scan schedule | Patient + Tech | `scan_schedule_confirmed`, `technician_visit_assigned` |
| 8 | Tech: visit started / reached | Ops | `visit_started`, `visit_reached`, `scan_started` |
| 9 | Tech: complete scan | Ops + Patient | `scan_completed`, `sample_dispatch_pending` (pathology PKG) |
| 10 | Ops reviews scan | Doctor (PKG-3) | `scan_reviewed` |
| 11 | Ops assigns lab | Ops + Tech | `lab_assigned` |
| 12 | Tech collects + dispatches sample | Ops | `sample_dispatched` |
| 13 | Ops: received at lab → awaiting report | Ops | `sample_received_at_lab`, `awaiting_lab_report` |
| 14 | Ops uploads lab PDF | Ops + Doctor (PKG-3) | `lab_report_uploaded` |
| 15 | AI extraction saved / verified | Ops (+ Doctor PKG-3) | `ai_extraction_ready`, `ai_verified` |
| 16 | Ops generates + publishes report | Ops + Patient | `final_report_generated`, `final_report_published` |
| 17 | Patient requests consult / ops confirms | Ops + Doctor + Patient | `consultation_date_requested`, `consultation_schedule_confirmed` |
| 18 | Doctor completes consult | Ops | `consultation_completed` |
| 19 | Doctor publishes Rx | Patient + Ops | `prescription_published` |

## Automated tests

- `test_scan_notifications.py` — N2, N3
- `test_pathology_notifications.py` — N4–N8
- `test_report_ai_notifications.py` — N9–N12
- `test_consult_notifications.py` — N13–N14 (extend)
- `test_assignment_notifications.py` — N1 regression

## Verification (2026-06-21)

Integration tests executed locally — 10/10 passing for N1–N14 coverage:

| Checklist # | Trigger(s) | Verified by |
|-------------|------------|-------------|
| 3 | `enquiry_converted`, `order_created` | `test_order_from_enquiry_emits_converted_notification` |
| 6 | `scan_date_requested` | `test_scan_date_requested_notification` |
| 7 | `scan_schedule_confirmed`, `technician_visit_assigned` | `test_scan_schedule_confirmed_notifications` |
| 8 | `visit_started`, `visit_reached`, `scan_started` | `test_visit_notifications_through_complete` |
| 9 | `scan_completed`, `sample_dispatch_pending` | `test_sample_dispatch_pending_after_scan_on_pathology_package` |
| 11–14 | pathology pipeline | `test_pathology_pipeline_notifications` |
| 15–16 | `ai_extraction_ready`, `ai_verified`, `final_report_generated`, `final_report_published` | `test_ai_and_report_notifications` |
| 18 | `consultation_completed` | `test_consultation_completed_notification` |
| 19 | `prescription_published` | `test_prescription_published_notification` |

Rows 1–2, 4–5, 10, 17 covered by existing assignment/scan/consult tests (pre-existing). UI bell/WS spot-check: same inbox API assertions used in integration tests.
