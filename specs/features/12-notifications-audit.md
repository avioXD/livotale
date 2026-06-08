# Spec: Notifications & Audit Log

## Notifications (`INotificationService` → dummy)

### Channels (all dummy)

- WhatsApp
- SMS
- Email
- In-app

### Triggers

| Event | Recipients |
|-------|------------|
| Enquiry received | Ops team |
| Order created | Patient, Ops |
| Payment link sent | Patient |
| Payment success | Patient, Ops |
| Technician assigned | Technician, Patient |
| Scan scheduled | Patient, Technician |
| Scan completed | Ops, Patient |
| Lab report uploaded | Ops, Doctor (if pkg 3) |
| Final report generated | Ops |
| Final report published | Patient |
| Doctor assigned | Doctor, Patient |
| Consultation scheduled | Patient, Doctor |
| Prescription published | Patient |

### Log fields

`id`, `channel`, `template`, `recipient`, `payload`, `status`, `sent_at`, `order_id`, `patient_id`, `trigger`

### UI

- Admin: `/admin/notifications` — searchable log
- Patient: in-app notification list (dummy)

---

## Audit log

### Logged actions

Enquiry created/converted, patient created, package edited, order created, payment changed, technician assigned, scan uploaded, lab uploaded, AI completed, extracted data edited, report generated/published, doctor assigned, prescription created/published, user login, file uploaded.

### Fields

`action`, `entity_type`, `entity_id`, `old_value`, `new_value`, `performed_by`, `performed_at`, `ip_address` (dummy)

### UI

- Admin: `/admin/audit` — filter by entity, user, date

### API

- `GET /admin/audit?entity_type&entity_id&from&to`
- Middleware: `auditLog(action, entity, diff)` on mutating routes

## Reuse

- Extend `008` `spec-rbac-notifications-audit.md` patterns
- Existing `NotificationLogPage` → generalize
