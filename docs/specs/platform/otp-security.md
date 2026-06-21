# OTP Security Platform Spec

Cross-cutting rules for patient portal login OTP and technician field OTP checkpoints.

## Flows & purposes

| Flow | Send API | Verify API | `otp_challenges.purpose` |
|------|----------|------------|--------------------------|
| Patient portal login | `POST /patient-portal/otp/send` | `POST /patient-portal/otp/verify` | `patient_portal` |
| Operator intake | `POST /admin/orders/{id}/patient-intake/otp` | `POST /admin/orders/{id}/patient-intake/verify` | `operator_intake` |
| Technician intake | `POST /technician/orders/{id}/patient-intake/otp` | `POST .../patient-intake/verify` | `technician_intake` |
| Technician completion | `POST /technician/orders/{id}/visit-completion-otp` | `POST .../complete` | `technician_completion` |

Resend reuses the send endpoint (no dedicated resend route).

## Demo mode (`OTP_MODE=demo`)

- Fixed code `123456` stored as `hash_token(code)` in `identity.otp_challenges`
- Verify reads latest unconsumed row: hash compare, expiry, attempt limits
- No Twilio calls when `INTEGRATIONS_MODE=dummy`

| Rule | Value |
|------|-------|
| TTL | 10 minutes |
| Max verify attempts | 5 per challenge |
| Send rate limit | Max 3 sends per `(mobile, purpose)` per 15 minutes → HTTP 429 |
| Resend cooldown | Min 60 seconds between sends → HTTP 429 with `retryAfterSeconds` |
| On success | Set `consumed_at = now()` |

## Live mode (`OTP_MODE=live`)

- Send/verify delegated to Twilio Verify
- Audit row inserted on send (placeholder hash) for rate limiting
- App-layer send limits still apply

## Send response shape

```json
{
  "sent": true,
  "retryAfterSeconds": 60,
  "demoOtp": "123456"
}
```

- `demoOtp` only when `OTP_MODE=demo`
- `retryAfterSeconds` always on successful send (UI resend countdown)

Technician send endpoints include the same optional fields on the visit payload.

## UI requirements

| Flow | Double-submit guard | Resend cooldown | Demo hint |
|------|--------------------|-----------------|-----------|
| Patient login | Disable while loading | 60s after send | Show demo code in dev / when API returns `demoOtp` |
| Technician intake | `saving` guard | 60s resend link | Label shows demo code |
| Technician completion | `sending` + `acting` | 60s on resend link | Label shows demo code |

## Related specs

- [10-patient-portal.md](../features/10-patient-portal.md)
- [21-technician-field-portal.md](../features/21-technician-field-portal.md)
- [external-integrations.md](./external-integrations.md)
