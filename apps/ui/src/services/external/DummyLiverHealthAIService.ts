import type { AIExtractionJob } from '@/types/aiExtraction';
import type { FibrosisScanRecord } from '@/types/fibrosisScan';
import type { LiverHealthAIInput, LiverHealthReport, LiverHealthStatus } from '@/types/liverHealthReport';
import {
  bmiStatus,
  capStatus,
  cardiometabolicRisk,
  computeApri,
  computeFib4,
  computeLiverAge,
  computeLiverHealthScore,
  computeRecoveryPotential,
  estimateHeightCm,
  estimateWeightKg,
  interpretApri,
  interpretFib4,
  parseNumericField,
  roadmapFromScan,
  stiffnessStatus,
  targetWeightKg,
  verdictFromScore,
} from '@/services/liverCare/liverHealth.utils';

const CLINICAL_REFERENCES = [
  'AASLD Practice Guidance on MASLD/MASH Risk Assessment',
  'Sterling RK et al. — FIB-4 Index (original publication)',
  'Sumida et al., BMC Gastroenterology 2012 — FIB-4 validation in NAFLD/MASLD',
  'EASL/AASLD non-invasive fibrosis assessment guidelines',
];

function riskLevel(percent: number): LiverHealthStatus {
  if (percent < 25) return 'normal';
  if (percent < 45) return 'caution';
  if (percent < 65) return 'high';
  return 'critical';
}

function buildBiomarkers(
  scan: FibrosisScanRecord,
  fields: AIExtractionJob['fields'] | undefined,
  pathologyIncluded: boolean,
): LiverHealthReport['biomarkers'] {
  const rows: LiverHealthReport['biomarkers'] = [
    {
      parameter: 'BMI',
      result: String(scan.bmi),
      unit: 'kg/m²',
      optimalRange: '18.5–23.9',
      status: bmiStatus(scan.bmi),
      flag: scan.bmi > 25 ? 'high' : 'normal',
    },
  ];

  if (!pathologyIncluded || !fields?.length) return rows;

  for (const f of fields) {
    rows.push({
      parameter: f.fieldName,
      result: f.editableValue ?? f.extractedValue,
      unit: f.unit ?? undefined,
      optimalRange: f.referenceRange ?? '—',
      status: f.flag === 'high' || f.flag === 'critical' ? 'high' : f.flag === 'low' ? 'caution' : 'normal',
      flag: f.flag,
    });
  }

  return rows;
}

export class DummyLiverHealthAIService {
  async generateReport(input: LiverHealthAIInput): Promise<LiverHealthReport> {
    await new Promise((r) => setTimeout(r, 400));

    const { scan, pathologyFields, pathologyIncluded } = input;
    const alt = parseNumericField(pathologyFields ?? [], ['sgpt', 'alt']) ?? 48;
    const ast = parseNumericField(pathologyFields ?? [], ['sgot', 'ast']) ?? 42;
    const platelets = parseNumericField(pathologyFields ?? [], ['platelet']) ?? 165000;
    const hba1c = parseNumericField(pathologyFields ?? [], ['hba1c']);
    const triglycerides = parseNumericField(pathologyFields ?? [], ['triglyceride', 'tg']);
    const hemoglobin = parseNumericField(pathologyFields ?? [], ['hemoglobin', 'hb']);

    const fib4 = pathologyIncluded ? computeFib4(input.patientAge, ast, alt, platelets) : null;
    const apri = pathologyIncluded ? computeApri(ast, platelets) : null;
    const fib4Interp = fib4 != null ? interpretFib4(fib4) : null;
    const apriInterp = apri != null ? interpretApri(apri) : null;

    const healthScore = computeLiverHealthScore(scan, fib4, scan.bmi);
    const { verdict, level } = verdictFromScore(healthScore);
    const liverAge = computeLiverAge(input.patientAge, scan);
    const recovery = computeRecoveryPotential(scan);
    const weightKg = estimateWeightKg(scan.bmi);
    const heightCm = estimateHeightCm(scan.bmi, weightKg);
    const targetWt = targetWeightKg(heightCm);
    const weightLoss = Math.max(0, weightKg - targetWt);
    const cardioRisk = cardiometabolicRisk(scan.bmi, hba1c, triglycerides);
    const currentRoadmap = roadmapFromScan(scan);

    const steatosisStages = ['S0', 'S1', 'S2', 'S3'] as const;
    const activeGrade = scan.steatosisGrade.toUpperCase().replace(/[^S0-3]/g, '') || 'S1';

    const aiSummary = [
      `Your liver shows ${scan.interpretation.toLowerCase()} with ${scan.steatosisGrade} steatosis on FibroScan.`,
      fib4Interp
        ? `FIB-4 score of ${fib4!.toFixed(2)} indicates ${fib4Interp.label.toLowerCase()}.`
        : 'Pathology panel was not included in your package; scores rely on transient elastography.',
      recovery >= 80
        ? 'With targeted weight loss and lifestyle changes, significant liver fat reduction is achievable within 6–12 months.'
        : 'Structured hepatology follow-up and sustained lifestyle intervention are recommended.',
    ].join(' ');

    return {
      id: `lhr-${input.orderId}`,
      orderId: input.orderId,
      header: {
        reportId: input.reportId,
        reportTitle: 'LIVOTALE™ AI-HYBRID LIVER HEALTH REPORT',
        patientName: input.patientName,
        patientAge: input.patientAge,
        patientSex: input.patientSex,
        orderNumber: input.orderNumber,
        packageName: input.packageName,
        generatedAt: new Date().toISOString(),
        scanDate: scan.scanAt,
        pathologyIncluded,
      },
      liverHealthScore: {
        score: healthScore,
        maxScore: 100,
        verdict,
        verdictLevel: level,
        aiHybridSummary: aiSummary,
      },
      roadmap: {
        currentStage: currentRoadmap,
        stages: [
          { id: 'healthy', label: 'Healthy Liver', description: 'Normal stiffness & fat' },
          { id: 'fatty', label: 'Fatty Liver', description: 'Hepatic steatosis (MASLD)' },
          { id: 'fibrosis', label: 'Fibrosis', description: `Stage ${scan.fibrosisStage}` },
          { id: 'cirrhosis', label: 'Cirrhosis', description: 'Advanced scarring' },
        ],
      },
      fibroScan: {
        liverStiffnessKpa: scan.liverStiffnessKpa,
        stiffnessStage: scan.fibrosisStage,
        stiffnessStatus: stiffnessStatus(scan.liverStiffnessKpa),
        capDbm: scan.capDbm,
        steatosisGrade: scan.steatosisGrade,
        steatosisStatus: capStatus(scan.capDbm),
        iqrMedianPercent: scan.iqrMedianPercent,
        probeType: scan.probeType,
      },
      liverAge: {
        liverAgeYears: liverAge,
        actualAgeYears: input.patientAge,
        ageGapYears: liverAge - input.patientAge,
        recoveryPotentialPercent: recovery,
        recoveryLabel: recovery >= 80 ? 'Excellent' : recovery >= 65 ? 'Good' : 'Moderate',
      },
      progressionRisks: [
        { id: 'cirrhosis', label: 'Cirrhosis Risk (5 yr)', percent: Math.min(85, Math.round(scan.liverStiffnessKpa * 5)), level: riskLevel(scan.liverStiffnessKpa * 5) },
        { id: 'mash', label: 'MASH Progression', percent: Math.min(80, Math.round((scan.capDbm - 200) / 4)), level: riskLevel((scan.capDbm - 200) / 4) },
        { id: 'cvd', label: 'Heart Disease Risk', percent: cardioRisk, level: riskLevel(cardioRisk) },
        { id: 'diabetes', label: 'Diabetes Risk', percent: hba1c != null ? Math.min(90, Math.round((hba1c - 4.5) * 20)) : Math.round(scan.bmi * 1.5), level: riskLevel(scan.bmi * 1.5) },
        { id: 'nafld', label: 'NAFLD Worsening', percent: Math.min(75, Math.round((scan.capDbm - 220) / 3)), level: riskLevel((scan.capDbm - 220) / 3) },
        { id: 'hcc', label: 'HCC Surveillance Need', percent: scan.liverStiffnessKpa > 10 ? 55 : 18, level: scan.liverStiffnessKpa > 10 ? 'high' : 'normal' },
      ],
      atAGlance: [
        { parameter: 'BMI', result: String(scan.bmi), status: bmiStatus(scan.bmi), statusLabel: scan.bmi >= 25 ? 'Overweight' : 'Normal' },
        { parameter: 'LSM', result: String(scan.liverStiffnessKpa), unit: 'kPa', status: stiffnessStatus(scan.liverStiffnessKpa), statusLabel: scan.fibrosisStage },
        { parameter: 'CAP', result: String(scan.capDbm), unit: 'dB/m', status: capStatus(scan.capDbm), statusLabel: scan.steatosisGrade },
        ...(hemoglobin != null ? [{ parameter: 'Hemoglobin', result: String(hemoglobin), unit: 'g/dL', status: hemoglobin < 12 ? 'caution' as const : 'normal' as const, statusLabel: hemoglobin < 12 ? 'Low' : 'Normal' }] : []),
        { parameter: 'ALT', result: String(alt), unit: 'U/L', status: alt > 56 ? 'high' as const : 'normal' as const, statusLabel: alt > 56 ? 'High' : 'Normal' },
        { parameter: 'AST', result: String(ast), unit: 'U/L', status: ast > 40 ? 'caution' as const : 'normal' as const, statusLabel: ast > 40 ? 'Elevated' : 'Normal' },
        ...(triglycerides != null ? [{ parameter: 'Triglycerides', result: String(triglycerides), unit: 'mg/dL', status: triglycerides > 150 ? 'high' as const : 'normal' as const, statusLabel: triglycerides > 150 ? 'High' : 'Normal' }] : []),
        ...(hba1c != null ? [{ parameter: 'HbA1c', result: String(hba1c), unit: '%', status: hba1c >= 5.7 ? 'caution' as const : 'normal' as const, statusLabel: hba1c >= 6.5 ? 'Diabetic range' : hba1c >= 5.7 ? 'Prediabetes' : 'Normal' }] : []),
      ],
      keyInsight: `Your liver is biologically ${liverAge - input.patientAge} years older than your actual age. Target ${weightLoss} kg weight loss over 6 months to improve liver fat and stiffness.`,
      biomarkers: buildBiomarkers(scan, pathologyFields, pathologyIncluded),
      nonInvasiveScores: [
        ...(fib4 != null && fib4Interp
          ? [{ name: 'FIB-4 Index', value: fib4.toFixed(2), interpretation: fib4Interp.label, status: fib4Interp.status, reference: '<1.30 low · >2.67 high' }]
          : []),
        ...(apri != null && apriInterp
          ? [{ name: 'APRI Score', value: apri.toFixed(2), interpretation: apriInterp.label, status: apriInterp.status, reference: '<0.5 no fibrosis' }]
          : []),
        { name: 'FAST Score', value: (scan.capDbm / 100 + scan.liverStiffnessKpa / 10).toFixed(2), interpretation: scan.liverStiffnessKpa > 8 ? 'Elevated — MASH concern' : 'Low to moderate', status: scan.liverStiffnessKpa > 8 ? 'caution' : 'normal', reference: 'Steatosis + stiffness composite' },
        { name: 'NAFLD Fibrosis Score', value: (fib4 != null ? (fib4 * 0.4 - 1.5).toFixed(2) : '-1.2'), interpretation: fib4 != null && fib4 < 1.3 ? 'Low risk' : 'Indeterminate', status: fib4 != null && fib4 < 1.3 ? 'normal' : 'caution', reference: 'Age, BMI, AST/ALT, albumin, platelets' },
        { name: 'BARD Score', value: String(scan.bmi >= 28 ? 2 : 1), interpretation: scan.bmi >= 28 ? 'Moderate risk' : 'Low risk', status: scan.bmi >= 28 ? 'caution' : 'normal', reference: 'BMI, AST/ALT ratio, diabetes' },
      ],
      bodyComposition: {
        weightKg,
        heightCm,
        bmi: scan.bmi,
        targetWeightKg: targetWt,
        weightLossNeededKg: weightLoss,
        bmiStatus: bmiStatus(scan.bmi),
      },
      liverFat: {
        capDbm: scan.capDbm,
        steatosisGrade: scan.steatosisGrade,
        stageLabel: scan.steatosisGrade,
        stages: steatosisStages.map((g) => ({
          grade: g,
          label: g === 'S0' ? 'No fat' : g === 'S1' ? 'Mild' : g === 'S2' ? 'Moderate' : 'Severe',
          range: g === 'S0' ? '<238' : g === 'S1' ? '238–260' : g === 'S2' ? '260–290' : '≥290',
          active: activeGrade.startsWith(g),
        })),
      },
      prescription: [
        {
          title: 'Eat More',
          tone: 'positive',
          items: ['Leafy greens & cruciferous vegetables', 'Whole grains & legumes', 'Fatty fish (omega-3)', 'Berries & citrus fruits', 'Green tea & adequate water'],
        },
        {
          title: 'Reduce / Avoid',
          tone: 'negative',
          items: ['Sugary drinks & refined carbs', 'Fried & ultra-processed foods', 'Alcohol (complete abstinence advised)', 'Excess red meat & trans fats', 'Late-night heavy meals'],
        },
        {
          title: 'Physical Activity',
          tone: 'neutral',
          items: ['Brisk walking 30–45 min daily', 'Resistance training 2×/week', 'Yoga / mobility for stress', `Target: lose ${weightLoss} kg in 6 months`],
        },
      ],
      actionPlan: [
        { id: 'ap1', label: `Target weight loss: ${weightLoss} kg in 6 months` },
        { id: 'ap2', label: 'Repeat FibroScan in 12 months' },
        { id: 'ap3', label: pathologyIncluded ? 'Repeat LFT panel in 6 months' : 'Consider comprehensive LFT if symptoms persist' },
        { id: 'ap4', label: 'Strict alcohol abstinence' },
        { id: 'ap5', label: 'Hepatology review if LSM > 9 kPa or rising enzymes' },
      ],
      aiSummary,
      aiSummaryCards: [
        { id: 'sc', icon: 'trophy', title: 'Liver Health Score', value: `${healthScore}/100`, subtitle: verdict },
        { id: 'rp', icon: 'heart', title: 'Recovery Potential', value: `${recovery}%`, subtitle: recovery >= 80 ? 'Excellent' : 'Action needed' },
        { id: 'wl', icon: 'target', title: 'Weight Loss Target', value: `${weightLoss} kg`, subtitle: `Reach ${targetWt} kg` },
        { id: 'nr', icon: 'calendar', title: 'Next Review', value: '12 Months', subtitle: 'FibroScan follow-up' },
      ],
      clinicalReferences: CLINICAL_REFERENCES,
      generatedBy: 'ai-hybrid',
      createdAt: new Date().toISOString(),
    };
  }
}

export const dummyLiverHealthAIService = new DummyLiverHealthAIService();
