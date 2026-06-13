# Spec: AI-Hybrid Liver Health Dashboard Report

**Module**: Visual liver health report for doctor & patient portals  
**Interface**: `ILiverHealthAIService` → `DummyLiverHealthAIService`  
**Service**: `LiverHealthReportService`

## Clinical foundations

Underlying scores anchor to validated hepatology literature:

| Source | Use in Livotale |
|--------|-----------------|
| AASLD Practice Guidance on MASLD/MASH Risk Assessment | FIB-4 + non-invasive testing framework |
| Sterling RK et al. (FIB-4 original) | FIB-4 formula and cutoffs |
| Sumida et al., BMC Gastroenterology 2012 | FIB-4 validation in NAFLD/MASLD |
| EASL/AASLD non-invasive fibrosis guidelines | Transient elastography (LSM/CAP) + FIB-4 as first-line |

## Livotale differentiators (patient-facing)

Beyond raw fibrosis stage, the dashboard surfaces:

| Metric | Description |
|--------|-------------|
| Liver Health Score | 0–100 composite (scan + labs + scores) |
| Liver Age | Biological liver age vs chronological age |
| Recovery Potential % | Reversibility estimate from steatosis/fibrosis profile |
| 5-Year Progression Risk | Cirrhosis, MASH, CVD, diabetes progression bands |
| Weight Loss Needed | kg to target BMI for liver recovery |
| Cardiometabolic Risk Score | 0–100 from BMI, lipids, HbA1c, BP |
| AI-Hybrid Clinical Summary | Narrative + action cards |

## Data sources

| Input | Required for |
|-------|--------------|
| Fibrosis scan (LSM, CAP, F-stage, BMI) | All packages with scan |
| Verified pathology AI fields | PKG-2, PKG-3 only |
| Patient demographics (age, sex) | Score calculations |

## Visibility rules

| Audience | When visible |
|----------|--------------|
| Doctor | Scan captured; pathology section if package includes pathology **and** AI verified |
| Patient | Final report `published` or `locked`; same pathology gate |
| Admin/Ops | Same as doctor on order detail |

PKG-1 shows scan-only dashboard (no pathology panels).

## Dashboard layout (3 scroll sections)

### Section 1 — Executive summary
- Report header (patient, date, report ID)
- Liver Health Score (circular gauge)
- Progressive Liver Roadmap (Healthy → Fatty → Fibrosis → Cirrhosis)
- FibroScan gauges (LSM kPa, CAP dB/m)
- Liver Age meter + recovery potential
- 5-Year risk matrix (horizontal progress bars)
- At-a-glance vitals table
- Key insight callout + QR placeholder

### Section 2 — Clinical detail
- Detailed biomarkers table (parameter, result, range, status dot)
- Non-invasive scores (FIB-4, NAFLD FS, APRI, FAST, BARD)
- Body composition card (weight, height, BMI, target)
- Liver fat analysis (CAP donut + S0–S3 legend)

### Section 3 — Action plan
- Personalized prescription columns (Eat more / Reduce / Activity)
- Follow-up checklist
- AI summary cards (score, recovery %, next review)

## API (future)

```
POST /orders/:id/liver-health-report/generate
GET  /orders/:id/liver-health-report
GET  /patient/orders/:id/liver-health-report  (published gate)
```

Request body feeds scan JSON + verified pathology fields. Response: `LiverHealthReport` (see `src/types/liverHealthReport.ts`).

## UI routes

| Route | Audience |
|-------|----------|
| Doctor consultation → Patient tab → Clinical data | Embedded dashboard |
| `/patient/orders/:id/report` | Full dashboard (published) |
| Admin order detail → Final report section | Preview alongside letterhead PDF |

## Mock mode

`DummyLiverHealthAIService.generateReport()` derives all metrics from `MOCK_FIBROSIS_SCANS` + `MOCK_AI_JOBS`. Cached per order in `MOCK_LIVER_HEALTH_REPORTS`.

## Related specs

- [05-fibrosis-scan-technician.md](./05-fibrosis-scan-technician.md)
- [06-partner-lab-pathology.md](./06-partner-lab-pathology.md)
- [07-ai-extraction.md](./07-ai-extraction.md)
- [08-final-reports.md](./08-final-reports.md)
- [10-patient-portal.md](./10-patient-portal.md)
