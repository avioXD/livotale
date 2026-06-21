# External Integrations Platform

Platform-wide configuration for SMS (Twilio), email (SendGrid), AI extraction, message templates, and PDF letterheads.

## Scope

- **Super Admin**: Twilio, SendGrid, AI credentials (encrypted in DB); PDF template HTML; test send panel
- **City Manager**: Edit message template subject/body only
- **WhatsApp / Razorpay**: UI cards disabled ("Coming soon") — not implemented

## Storage

| Item | Location |
|------|----------|
| Credentials | `integrations.platform_settings` (AES-GCM via `INTEGRATIONS_ENCRYPTION_KEY`) |
| Message templates | `integrations.message_templates` (code + channel unique) |
| PDF letterhead | `clinical.letterhead_templates` |
| Dispatch audit | `integrations.notifications_log` |

## Modes

- `INTEGRATIONS_MODE=dummy` — log dispatch, no outbound Twilio/SendGrid calls
- `OTP_MODE=demo` — fixed OTP `123456`; live uses Twilio Verify
- Test SMS requires phone in `NOTIFICATION_TEST_PHONE_ALLOWLIST` (e.g. `+917001638349`)

## OTP

Patient portal and technician field OTP use **Twilio Verify** in live mode. Transactional SMS (payment links, reminders) use **Messages API** + `MessagingServiceSid`.

Demo mode validates against `identity.otp_challenges` with send cooldown and rate limits — see [otp-security.md](./otp-security.md).

## API

- `GET/PUT /admin/integrations/settings` — Super Admin
- `POST /admin/integrations/settings/test-sms|test-email`
- `GET/PUT /admin/integrations/message-templates`
- `GET/PUT /admin/integrations/pdf-templates`
- `POST /admin/orders/:id/send-payment-link` — backend notification dispatch

## Security

- Credentials never returned decrypted; masked as `••••` + last 4 chars
- Test SMS gated by env allowlist
- Separate encryption key from bank details
