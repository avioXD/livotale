# Spec: Care Coaching Follow-up (FastAPI)

**Module**: Dietician / health coach sessions  
**Roles**: Care team member (write)  
**API base**: FastAPI `/api/v1/care/org`

## Purpose

Care team members manage assigned patient coaching sessions and recommend follow-up when a session requires continued care. Ported from legacy Node `/care/appointments/*`.

## Appointment types (care)

- `dietician_consultation`
- `health_coach_follow_up`

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/care/org/appointments?filter=upcoming\|today\|completed` | List assigned sessions |
| GET | `/care/org/appointments/{id}` | Session detail + notes + timeline |
| POST | `/care/org/appointments/{id}/notes` | Add session note `{ note, visibleToPatient? }` |
| POST | `/care/org/appointments/{id}/recommend-follow-up` | Recommend follow-up `{ reason, notes?, followUpDays? }` |

## Access rules

Care team member must be:
- Directly assigned (`appointments.care_team_member_id`), OR
- Active assignment on patient via `care.care_team_assignments` for care-type appointments

## Recommend follow-up behavior

1. Transition appointment status → `follow_up_required`
2. Insert `care.care_tasks` row: `task_type=monthly_followup`, `due_date = today + followUpDays` (default 14)
3. Emit `care_task_assigned` notification to assignee

## UI

- `CareSessionsPage` at `/org/:city/coaching`
- `CareAppointmentsService.ts` calls `/care/org/appointments/*`

## Out of scope

- Full legacy appointment scheduling module (see F05)
- Doctor appointment prescription flow (retired → Liver Care consultations)
