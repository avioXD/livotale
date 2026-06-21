# I02 — Log Fields: Textarea & Validation Specification

**Definition — log-style field**: free-text operational content that may span multiple lines, persisted to audit/CRM/clinical/ops tables (`text` columns), including remarks, notes, call logs, rejection reasons, and payment references.

**Not in scope**: single-line identifiers (receipt numbers under 80 chars can stay `Input` if product confirms — listed as optional).

---

## Shared primitives

### `src/utils/fieldLimits.ts`

| Key | Max chars | Used for |
|-----|-----------|----------|
| `LOG_SHORT` | 500 | Payment/collection notes, route request notes |
| `LOG_MEDIUM` | 2000 | Call remarks, internal ops notes, intake verify notes |
| `LOG_LONG` | 8000 | Doctor clinical notes, prescription notes, service zone notes |
| `LOG_MESSAGE` | 4000 | Enquiry message, public enquiry body |

DB columns are `text` (unlimited) — limits are **UI + API UX** guards to prevent abuse; API can add `Field(max_length=N)` in a follow-up.

### `src/components/forms/LogTextarea.tsx`

Props: `value`, `onChange`, `limit` (key of fieldLimits), `label`, `placeholder`, `rows`, `disabled`, `required?`

Behaviour:

- Renders shadcn `Textarea`
- Shows `{count}/{max}` below field when `count > max * 0.8`
- `aria-invalid` when over limit
- Parent form disables submit when over limit

---

## Field inventory

### P0 — Change Input → Textarea + validation

| File | Field ID | Label | Limit | Notes |
|------|----------|-------|-------|-------|
| `AdminCollectPaymentModal.tsx` | `collect-notes` | Notes | LOG_SHORT | Receipt/UPI refs; allow multiline |
| `LiverCareOfflinePaymentModal.tsx` | `remarks` | Remarks | LOG_SHORT | |
| `LiverCarePrescriptionEditor.tsx` | `rx-notes` | Clinical notes | LOG_LONG | Currently **Input** — must fix |
| `CareSessionsPage.tsx` | follow-up reason | Follow-up reason | LOG_MEDIUM | Verify control type |

### P1 — Already Textarea; add validation only

| File | Field | Limit |
|------|-------|-------|
| `EnquiryFollowUpNotesPanel.tsx` | call remarks, internal notes | LOG_MEDIUM each |
| `EnquiryCreateOrderPanel.tsx` | call remarks, internal notes | LOG_MEDIUM |
| `EnquiryOrderOutcomePanel.tsx` | order outcome remarks | LOG_MEDIUM |
| `OrderPatientIntakePanel.tsx` | verify notes | LOG_MEDIUM |
| `OrderFibroScanIntakePanel.tsx` | verify notes | LOG_MEDIUM |
| `AdminSampleCollectionDetailPanel.tsx` | collection remarks | LOG_MEDIUM |
| `TechnicianSampleCollectionPanel.tsx` | collection/handover remarks | LOG_SHORT |
| `TechnicianRouteRequestPanel.tsx` | route request note | LOG_SHORT |
| `LiverFibrosisScanCapturePanel.tsx` | technician remarks | LOG_MEDIUM |
| `DoctorConsultationPrescriptionTab.tsx` | visit notes | LOG_LONG |
| `PrescriptionBuilderPanel.tsx` | doctor notes | LOG_LONG |
| `PrescriptionsPage.tsx` | review notes | LOG_MEDIUM |
| `PatientHistoryPanels.tsx` | family history notes | LOG_LONG |
| `ServiceZoneFormPanel.tsx` | zone notes | LOG_LONG |
| `PartnerLabFormPanel.tsx` | ops context / notes fields | LOG_LONG |

### P2 — Read-only log displays (no edit control)

| Page | Action |
|------|--------|
| `EnquiryViewPanel.tsx` | Display follow-up log entries — wrap long text with `whitespace-pre-wrap` |
| `AdminAuditLogPage.tsx` | Truncate `oldValue`/`newValue` with expand — optional |
| `AdminLiverCareNotificationsPage.tsx` | Template column — tooltip for full payload |

### Staff document verify notes

| File | Action |
|------|--------|
| `StaffMemberDetailPanel.tsx` | Ensure verify/reject modal uses `LogTextarea` (LOG_MEDIUM) if not already |

---

## Validation rules

| Rule | Implementation |
|------|----------------|
| Max length | Enforced client-side before API call |
| Trim | `.trim()` on submit; empty optional → `undefined` |
| Required fields | Follow-up status change may require call remarks when status = `contacted` — **existing CRM rules**; document in enquiry store |
| XSS | React escaping sufficient; no `dangerouslySetInnerHTML` on user notes |
| API errors | Toast via global interceptor (Phase H) |

### Enquiry-specific (from CRM spec)

| Scenario | Validation |
|----------|------------|
| Add follow-up | `status` required; `callRemarks` recommended when status ∈ {contacted, interested, follow_up_required} |
| Order outcome | `orderOutcome` required; remarks required when outcome ∈ {cancelled, payment_failed, defaulter} |
| Create order from enquiry | Package required; internal notes optional |

---

## API alignment (optional Phase I+)

Add to FastAPI schemas (non-breaking if only max_length):

```python
internal_notes: str | None = Field(default=None, max_length=2000, alias="internalNotes")
call_remarks: str | None = Field(default=None, max_length=2000, alias="callRemarks")
remarks: str | None = Field(default=None, max_length=500)
doctor_notes: str | None = Field(default=None, max_length=8000, alias="doctorNotes")
```

---

## Testing

- Unit: `fieldLimits` + `LogTextarea` over-limit disables submit in enquiry follow-up form test
- E2E: Submit enquiry follow-up with 2001-char internal note → inline error, no API call
- Visual: all migrated fields show ≥2 rows by default
