# Spec: Final Report Generation

**Module**: Letterhead reports, PDF, patient publish  
**Interface**: `IPDFGenerationService` → `DummyPDFGenerationService`

## Report types by package

| Package | Report type |
|---------|-------------|
| PKG-1 | Fibrosis Scan Report |
| PKG-2 | Combined Fibrosis + Pathology Report |
| PKG-3 | Combined report (+ separate prescription doc) |

## Report content

- Company letterhead (template)
- Patient & order details
- Package summary
- Fibrosis scan parameters table
- Pathology table (if applicable)
- Interpretation narrative
- Medical disclaimer (when no doctor consult)
- `report_id`, QR code, generated_at, authorized_by
- Footer, terms, page numbers

## Features

- Preview HTML
- Generate PDF (dummy: returns blob URL / data URL)
- Regenerate after data edit (new version)
- Lock on publish
- Publish → visible in patient portal
- Admin/ops internal view always

## Templates admin

`letterhead_templates`, `report_templates` — admin upload/manage.

## API

- `POST /admin/orders/:id/reports/preview`
- `POST /admin/orders/:id/reports/generate`
- `POST /admin/orders/:id/reports/publish`
- `GET /patient/orders/:id/reports` (published only)

## Realign

- `006` clinical reports → split **internal clinical** vs **final patient report**
