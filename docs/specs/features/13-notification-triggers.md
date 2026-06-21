# Spec: Notification Triggers & Recipients

**Channels (dummy)**: in-app push (bell), WhatsApp, SMS, email  
**UI**: Top-left bell (unread badge) + sidebar **Notifications** tab for all staff roles; patient portal bell + `/patient/notifications`

## Legend

| Recipient | Meaning |
|-----------|---------|
| **Ops** | `OPERATIONS` role |
| **Admin** | `CITY_MANAGER`, `SUPER_ADMIN` |
| **Tech** | `TECHNICIAN` |
| **Doctor** | `DOCTOR` |
| **Patient** | Order phone — patient OTP portal |
| **All staff** | Ops + Admin + Tech + Doctor |

---

## Enquiry & orders

| Trigger action | When | Recipients | Channels |
|----------------|------|------------|----------|
| `enquiry_received` | Public form / WhatsApp enquiry created | Ops, Admin | in-app, email |
| `enquiry_assigned` | Ops assigns executive | Assigned ops user | in-app |
| `enquiry_converted` | Enquiry → order draft | Ops, Patient | in-app, WhatsApp |
| `order_created` | Order submitted | Ops, Patient | in-app, WhatsApp |
| `payment_link_sent` | Ops sends payment link | Patient | WhatsApp, SMS, in-app |
| `payment_completed` | Payment success (offline/portal) | Ops, Patient, Admin | in-app, WhatsApp |
| `payment_failed` | Dummy payment failure | Patient, Ops | in-app |

---

## Fibrosis scan (technician)

| Trigger action | When | Recipients | Channels |
|----------------|------|------------|----------|
| `scan_date_requested` | Patient submits preferred scan slot | Ops, Admin | in-app |
| `scan_schedule_confirmed` | Ops atomic confirm (slot + technician) | Patient, Tech | in-app, SMS |
| `technician_assigned` | Ops assigns technician (legacy path) | Tech, Patient | in-app, WhatsApp |
| `scan_scheduled` | Visit date set (legacy / internal) | Tech, Patient | in-app, SMS |
| `visit_started` | Tech marks en route | Ops, Admin | in-app |
| `visit_reached` | Tech marks at patient location | Ops, Admin | in-app |
| `scan_completed` | Fibrosis scan saved / visit complete | Ops, Patient | in-app, SMS |
| `scan_reviewed` | Ops reviews scan data | Doctor (if PKG-3) | in-app |

---

## Partner lab pathology (external — no in-house lab)

| Trigger action | When | Recipients | Channels |
|----------------|------|------------|----------|
| `lab_assigned` | Ops assigns partner lab on order | Ops, Tech | in-app |
| `sample_dispatch_pending` | Scan done; blood sample ready to send | Tech, Ops | in-app |
| `sample_dispatched` | Tech/Ops marks sample sent to partner lab | Ops, Admin | in-app |
| `sample_received_at_lab` | Ops confirms lab received sample | Ops | in-app |
| `awaiting_lab_report` | Waiting for partner lab PDF via email | Ops | in-app, email |
| `lab_report_uploaded` | Ops uploads PDF received from lab email | Ops, Doctor (PKG-3) | in-app |
| `ai_extraction_ready` | Dummy AI finished — review pending | Ops | in-app |
| `ai_reupload_required` | Ops requests new PDF | Ops, Tech | in-app |
| `ai_verified` | Ops verified extracted fields | Ops, Doctor (PKG-3) | in-app |

---

## Final report & consultation

| Trigger action | When | Recipients | Channels |
|----------------|------|------------|----------|
| `final_report_generated` | Ops generates letterhead report | Ops, Admin | in-app |
| `final_report_published` | Report published to patient | Patient, Ops | in-app, WhatsApp |
| `consultation_date_requested` | Patient submits preferred consult slot | Ops, Admin | in-app |
| `consultation_schedule_confirmed` | Ops atomic confirm (slot + doctor) | Patient, Doctor | in-app, WhatsApp |
| `doctor_assigned` | Ops assigns doctor (PKG-3) | Doctor, Patient | in-app, WhatsApp |
| `consultation_scheduled` | Video consult scheduled | Doctor, Patient | in-app, WhatsApp |
| `consultation_completed` | Doctor completes consult | Ops | in-app |
| `prescription_published` | Doctor publishes Rx | Patient, Ops | in-app, WhatsApp |

---

## Care tasks

| Trigger action | When | Recipients | Channels |
|----------------|------|------------|----------|
| `care_task_assigned` | Follow-up task created with assignee | Assigned user | in-app |
| `care_task_escalation` | Doctor escalation task (no assignee) | Doctor role | in-app |

---

## System

| Trigger action | When | Recipients | Channels |
|----------------|------|------------|----------|
| `otp_sent` | Patient portal login | Patient | SMS (dummy) |
| `audit_alert` | Critical admin action | Admin | in-app, email |

---

## User vs role targeting

| Trigger | Targeting |
|---------|-----------|
| `enquiry_assigned` | **User** — assigned executive only |
| `technician_visit_assigned` | **User** — assigned technician only |
| `technician_assigned` | **User** (tech) + **phone** (patient) |
| `doctor_assigned` | **User** (doctor) + **phone** (patient) |
| `lab_assigned` | **Role** (Ops) + **User** (technician if set) |
| `scan_date_requested`, `consultation_date_requested`, `visit_started`, … | **Role** broadcast |

Inbox stores `recipient_type` = `role` | `phone` | `user` and `trigger_action` for filtering. Staff bell merges role + user rows for the logged-in user.

---

## Implementation notes

- Backend `WorkflowNotificationService` + `NotificationDispatchService` enqueue and inline-process outbox → `audit.inbox_notifications`.
- WebSocket channels: `ws:notifications:{role}` and `ws:notifications:user:{userId}`.
- Bell shows unread count for merged inbox (role + user).
- Full history at `/notifications` (staff) or `/patient/notifications` (patient portal).
- Admin **Notification log** (`/admin/notifications`) remains channel dispatch audit for ops/admin.
- Care tasks (legacy Node) call `POST /internal/notifications/emit`.
