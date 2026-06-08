# Feature Specification: Clinical Reports (Visual Insights)

**Feature Branch**: `006-clinical-reports` | **Created**: 2026-06-06 | **Status**: Approved

## Objective

Renamed **Clinical Reports** section: list reports with unique IDs and dates; **Insight View** with colorful criticality-coded metrics and anatomy body map; **Original Document** tab with PDF embed.

## User Stories

### P1 — Report Library
Each report shows unique report code, type, date, overall criticality badge.

### P1 — Insight View
Color-coded metric sections; human body map highlighting scanned regions with values and criticality colors.

### P1 — Original PDF
Embedded PDF viewer (or fallback preview) for the source document.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/patient/reports` | List with summary |
| GET | `/patient/reports/:reportKey` | Full insight + PDF metadata |

Report key format: `lab:{id}` | `Liver Fibrosis Scan:{id}` | `historical:{id}`

See [plan.md](./plan.md).
