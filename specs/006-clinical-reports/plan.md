# Plan: Clinical Reports

## DB (019)
- `report_code` on lab_reports and patient_old_reports

## Backend
- `reportService.js` — list, detail, criticality, body map points

## Frontend
- Anatomy SVG body map (`AnatomyBodyMap.tsx`)
- `ReportInsightPanel`, `ReportPdfViewer`, `ReportsPage`, `ReportDetailPage`

Architecture: Pages → store → service → API.
