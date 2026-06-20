# Assignment Notifications

**Status**: Implemented  
**Scope**: Liver Care assignments + `care.care_tasks`

## Goal

When a task or assignee is set (enquiry executive, technician, doctor, lab, care task), the assigned **user** (or role where spec requires) receives an in-app notification delivered via inbox + WebSocket realtime.

## Recipient model

| recipient_type | recipient_id | Use |
|----------------|--------------|-----|
| `role` | API role code (`support`, `technician`, …) | Broadcast to all staff with that role |
| `phone` | Normalized patient phone | Patient portal inbox |
| `user` | `identity.users.id` | Assigned individual only |

Staff inbox API returns **union** of role-scoped + user-scoped rows for the authenticated user.

## Scenarios

| ID | Trigger | When | Recipients |
|----|---------|------|------------|
| S1 | `enquiry_assigned` | Ops assigns enquiry executive | Assigned ops user |
| S2 | `enquiry_assigned` | Reassign to different executive | New assignee only |
| S3 | `scan_schedule_confirmed` | Ops confirms scan slot + technician | Patient |
| S4 | `technician_visit_assigned` | Same as S3 | Assigned technician user |
| S5 | `technician_assigned` | Standalone technician assign/reassign | Assigned tech user + patient |
| S6 | `doctor_assigned` | Doctor assign/reassign | Doctor user + patient |
| S7 | `lab_assigned` | Partner lab assigned | Ops role + assigned technician user (if set) |
| S8 | `care_task_assigned` | Care follow-up task created | `assigned_to` user |
| S9 | `care_task_escalation` | Doctor escalation task (no assignee) | `DOCTOR` role |

## Edge cases

- Skip notification when assignee unchanged on update.
- Skip user notification when assignee is null.
- Multi-role users see role inbox + user inbox merged (dedupe by id).
- `mark_read` rejects notifications not owned by caller (role or user).

## Delivery pipeline

```
WorkflowNotificationService.emit → NotificationDispatchService.dispatch
  → enqueue_outbox (in_app) → process_pending_outbox (inline)
  → push_inbox (role | user | phone) → Redis ws:notifications:*
```

## APIs

| Method | Path | Notes |
|--------|------|-------|
| GET | `/notifications/inbox` | Merged role + user for JWT user |
| PATCH | `/notifications/inbox/{id}/read` | Ownership check |
| PATCH | `/notifications/inbox/read-all` | Marks role + user rows read |
| WS | `/ws/v1/notifications?role=&token=` | Subscribes role + user channels from JWT |
| POST | `/internal/notifications/emit` | Internal key; care task bridge |

## Tests

- Integration: enquiry assign, scan confirm, doctor assign, reassign no-op, internal emit
- Contract: merged inbox, mark_read 403 for foreign id
- E2E: assign enquiry executive → assignee sees notification
