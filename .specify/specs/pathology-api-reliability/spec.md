# Pathology API Reliability

**Status**: Implemented  
**Priority**: P2

## Fixes

1. Remove silent `transition_order` swallowing in pathology service — log warnings instead of `except AppError: pass`
2. Persist `emailFrom`, `emailSubject`, `emailReceivedAt` on `lab_report_uploads.extra` at upload
3. Integration helper aligned to partner-visit model (no courier dispatch step)
4. Contract smoke tests for pathology endpoints

## Endpoint matrix

All return 200 on happy path, 4xx on invalid state:

- POST assign-lab, lab-partner-order
- PATCH pathology-external-appointment
- POST schedule-pathology, lab-partner-visit, lab-partner-collected
- POST sample-dispatch/received, awaiting-report, lab-report
- POST ai-extract, ai-extraction/verify, final-report/generate, publish
