# Spec Split: RBAC, Notifications & Audit

**Parent**: [spec.md](./spec.md)

## Permission Matrix (v1)

| Action | Patient | Technician | Lab | Doctor | Admin |
|--------|---------|------------|-----|--------|-------|
| Book collection | ✓ | — | — | — | ✓ |
| View own status | ✓ | — | — | — | — |
| View assigned collection | — | ✓ | — | — | — |
| Upload sample photo | — | ✓ | — | — | — |
| View sample photo | — | — | ✓ | ✗* | ✓ |
| Receive/reject sample | — | — | ✓ | — | ✓ |
| Upload report | — | — | ✓ | — | ✓ |
| Approve report | — | — | ✗ | ✓** | ✓ |
| Download approved report | ✓ | — | — | ✓ | ✓ |
| Manual tech assign | — | — | — | — | ✓ |

\* Doctor visibility configurable per clinic  
\*\* When `requires_doctor_review` on test

## Notifications (queue via existing `appointmentNotificationService`)

| Event | Patient | Technician | Lab | Admin |
|-------|---------|------------|-----|-------|
| Booked | ✓ | — | — | — |
| Tech assigned | ✓ | ✓ | — | — |
| Pending assignment | — | — | — | ✓ |
| On the way | ✓ | — | — | — |
| Sample collected | ✓ | — | — | — |
| Handed to lab | — | — | ✓ | — |
| Sample rejected | ✓* | ✓ | — | ✓ |
| Report ready | ✓ | — | — | — |

## Audit Log

Table: `audit.sample_collection_events`

Fields: user_id, role, action, entity_type, entity_id, old_status, new_status, ip, user_agent, geo, metadata jsonb, created_at

Audited actions: book, auto_assign, manual_assign, status_change, photo_upload, handover, receive, reject, report_upload, approve, publish, download
