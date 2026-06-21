# Spec: Dummy External Services Layer

**Principle**: Controllers and UI call **interfaces**; dummy implementations registered in dev/mock mode.

## Service registry

```ts
// api/src/services/external/registry.js
export function getPaymentService(): IPaymentService
export function getWhatsAppService(): IWhatsAppService
// ... env: EXTERNAL_SERVICES_MODE=dummy|live
```

## Interfaces & dummy implementations

| Interface | Dummy class | Real (future) |
|-----------|-------------|---------------|
| `IPaymentService` | `DummyPaymentService` | `RazorpayPaymentService` |
| `IWhatsAppService` | `DummyWhatsAppService` | `MetaWhatsAppService` |
| `IFibrosisScanDeviceService` | `DummyFibrosisScanDeviceService` | `FibroScanDeviceService` |
| `IAIExtractionService` | `DummyAIExtractionService` | `OCRAIExtractionService` |
| `INotificationService` | `DummyNotificationService` | `TwilioSMSService` + email provider |
| `IPDFGenerationService` | `DummyPDFGenerationService` | `PuppeteerPDFService` |

## DummyWhatsAppService

- `receiveEnquiry(payload)` → enquiry record
- `sendPaymentLink(phone, link)`
- `sendOrderUpdate(phone, message)`
- `sendReportReady(phone, reportUrl)`
- All calls logged to `notifications_log`

## DummyPaymentService

See `spec-payment-dummy.md`

## DummyFibrosisScanDeviceService

- `fetchScanData(orderId, deviceSerial?)` → LSM/CAP/F-stage JSON
- `attachScanFile(orderId, fileMeta)`

## DummyAIExtractionService

See `spec-ai-extraction.md`

## DummyNotificationService

- `sendSms`, `sendEmail`, `sendWhatsApp`, `sendInApp`
- `sendOtp(phone)` → returns dev OTP
- Unified log row per send

## DummyPDFGenerationService

- `generateReportPdf(templateId, data)` → `{ url, fileId }`
- `generatePrescriptionPdf(templateId, data)`
- `generateInvoicePdf(data)`

## UI mirror

`src/services/external/` — same interfaces, mock implementations for `VITE_MOCK_MODE=true`.

## Admin settings

`/admin/settings/integrations` — show dummy mode badge, future API key fields (disabled).
