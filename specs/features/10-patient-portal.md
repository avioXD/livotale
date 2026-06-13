# Spec: Patient Portal

**Module**: Patient-facing app (OTP login, orders, assets)  
**Auth**: Phone number + dummy OTP (not staff username login)

## Login

- Route: `/patient/login`
- Enter phone → `DummyNotificationService.sendOtp()` → enter OTP → session
- Phone must match existing patient on an order
- Mock OTP: `123456` (dev hint on screen)

## Dashboard sections

- My profile (read/update limited fields)
- My orders (list with status stepper)
- Selected package & pricing
- Payment status + Pay now (if pending)
- Scan / consultation schedule
- Reports (published only)
- Prescriptions (published only)
- Download center (PDFs)
- Support / contact

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
| `/patient` | Dashboard |
| `/patient/orders/:id` | Order detail |
| `/patient/orders/:id/pay` | Dummy checkout |
| `/patient/reports/:id` | Report view/download |
| `/patient/prescriptions/:id` | Rx view/download |

## Realign

- `PatientJourneyPage` onboarding → simplify or merge into portal for post-order patients
- Staff mock logins remain 4 roles only; **patient uses separate login**

## Mock accounts

Seed patient: Rohan Mehta `+919900000001` — linked to sample PKG-2 order.
