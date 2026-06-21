# Spec: Patient Portal

**Module**: Patient-facing app (OTP login, orders, assets)  
**Auth**: Phone OTP only (separate from staff login)

## Shell & navigation (2026-06-21 redesign)

| Breakpoint | Navigation |
|------------|------------|
| Desktop (`lg+`) | Left sidebar: Dashboard, Orders, Notifications, Profile, Downloads; footer Support + Logout |
| Mobile | Bottom tabs: Home, Orders, Notifications, Profile; hamburger Sheet: Downloads, Support, Logout |
| Onboarding | Minimal header only (no sidebar / bottom nav) |

Config: `src/app/config/patientPortalNav.ts`  
Layout: `src/app/layouts/patient-portal/*`

## Login

- Route: `/patient/login`
- Enter phone → `POST /patient-portal/otp/send` → enter OTP → session
- Password login removed (`POST /auth/patient/login` returns 410)
- Phone must match existing patient on an order
- Mock OTP: `123456` (dev hint on screen); resend cooldown (disabled in demo `otp_mode`)
- See [otp-security.md](../platform/otp-security.md) for rate limits and table validation
- Desktop: split layout (brand panel + form); mobile: stacked full-height

## Dashboard sections

- Next-action hero card (pay / schedule / view report)
- Recent orders (max 2) with link to full orders list
- Health analytics panel when data exists
- Published reports / prescriptions shortcuts
- Unread notifications banner

Nav handles profile, notifications, downloads — no duplicate KPI shortcut tiles.

## Orders list

- Route: `/patient/orders`
- Each order card shows read-only **PatientOrderProgressStepper** (Payment → Scan → Pathology* → Report → Consult* → Prescription* → Complete)
- Primary CTA derived from order state

## Visibility gates

| Asset | Visible when |
|-------|--------------|
| Final report | `final_report.published_at` set — visual AI-hybrid dashboard + PDF download |
| Prescription | `prescription.status === published` |
| Invoice | payment success |
| Raw scan JSON | never (patient sees report PDF only) |

## Routes

| Route | Purpose |
|-------|---------|
| `/patient/login` | OTP auth |
| `/patient/onboarding` | First-time profile |
| `/patient` | Dashboard overview |
| `/patient/orders` | All orders with progress stepper |
| `/patient/orders/:id` | Order detail (`?focus=scan-schedule` scrolls to scheduling after pay) |
| `/patient/orders/:id/pay` | Razorpay checkout → redirect to order with `?focus=scan-schedule` on success |
| `/patient/orders/:id/report` | Report view/download |
| `/patient/orders/:id/prescription` | Rx view/download |
| `/patient/profile` | Profile + bank details |
| `/patient/notifications` | In-app inbox |
| `/patient/downloads` | PDF download center |

## Realign

- `PatientJourneyPage` onboarding → simplify or merge into portal for post-order patients
- Staff mock logins remain 4 roles only; **patient uses separate login**

## Post-payment scan scheduling

1. Patient completes pay via `POST /patient-portal/orders/{id}/pay` (uses `OrderService` payment transition).
2. Redirect to `/patient/orders/:id?focus=scan-schedule`.
3. Patient picks preferred 45-min slot from `GET /public/slots/scan`; submits via `POST .../scan-date`.
4. Patient sees assigned technician only after ops confirms (`scanScheduledAt` set).
5. Order timeline via `GET /patient-portal/orders/{id}/timeline?phone=` (not admin timeline route).

## Post-report consult scheduling (PKG-3)

1. After letterhead report is ready (`final_report_generated` or later), `PatientConsultScheduleSection` appears on order detail.
2. Patient picks preferred tele slot from `GET /public/slots/consult`; submits via `POST .../consult-date`.
3. Ops receives in-app `consultation_date_requested` notification.
4. Patient sees assigned doctor and confirmed time only after ops confirms (`consultationScheduledAt` set).
5. Re-submit blocked once preference is set (409) or consult is confirmed.

## Mock accounts

Seed patient: Rohan Mehta `+919900000001` — linked to sample PKG-2 order.
