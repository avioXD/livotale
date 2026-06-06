# Implementation Plan: Appointments Module

## DB (018)

- Extend `operations.home_visits`: `patient_notes`, `preferred_time_slot`
- `operations.appointment_status_events` — audit timeline per visit

## Backend

- `appointmentService.js` — book, list, detail, cancel, reschedule, slots, progress builder
- `routes/appointments.js` — patient + staff routes

## Frontend

- `AppointmentsService` + `appointmentsStore`
- `AppointmentsPage` with `BookAppointmentModal`, `AppointmentCard`, `AppointmentStatusStepper`

Architecture: Pages → store → service → API (constitution III).
