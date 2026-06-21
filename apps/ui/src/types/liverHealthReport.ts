import type { AIExtractionJob } from './aiExtraction';
import type { FibrosisScanRecord } from './fibrosisScan';

export type LiverHealthStatus = 'optimal' | 'normal' | 'caution' | 'high' | 'critical';

export interface LiverHealthAIInput {
  orderId: string;
  reportId: string;
  patientName: string;
  patientAge: number;
  patientSex: 'M' | 'F' | 'Other';
  orderNumber: string;
  packageName: string;
  pathologyIncluded: boolean;
  scan: FibrosisScanRecord;
  pathologyFields?: AIExtractionJob['fields'];
}

export type LiverRoadmapStage = 'healthy' | 'fatty' | 'fibrosis' | 'cirrhosis';

export interface LiverHealthReportHeader {
  reportId: string;
  reportTitle: string;
  patientName: string;
  patientAge: number;
  patientSex: 'M' | 'F' | 'Other';
  orderNumber: string;
  packageName: string;
  generatedAt: string;
  scanDate?: string;
  pathologyIncluded: boolean;
}

export interface LiverHealthScoreBlock {
  score: number;
  maxScore: number;
  verdict: string;
  verdictLevel: LiverHealthStatus;
  aiHybridSummary: string;
}

export interface LiverRoadmapBlock {
  currentStage: LiverRoadmapStage;
  stages: {
    id: LiverRoadmapStage;
    label: string;
    description: string;
  }[];
}

export interface FibroScanGaugeBlock {
  liverStiffnessKpa: number;
  stiffnessStage: string;
  stiffnessStatus: LiverHealthStatus;
  capDbm: number;
  steatosisGrade: string;
  steatosisStatus: LiverHealthStatus;
  iqrMedianPercent: number;
  probeType: string;
}

export interface LiverAgeBlock {
  liverAgeYears: number;
  actualAgeYears: number;
  ageGapYears: number;
  recoveryPotentialPercent: number;
  recoveryLabel: string;
}

export interface ProgressionRiskItem {
  id: string;
  label: string;
  percent: number;
  level: LiverHealthStatus;
  detail?: string;
}

export interface AtAGlanceRow {
  parameter: string;
  result: string;
  unit?: string;
  status: LiverHealthStatus;
  statusLabel: string;
}

export interface BiomarkerRow {
  parameter: string;
  result: string;
  unit?: string;
  optimalRange: string;
  status: LiverHealthStatus;
  flag?: 'normal' | 'high' | 'low' | 'critical';
}

export interface NonInvasiveScoreRow {
  name: string;
  value: string;
  interpretation: string;
  status: LiverHealthStatus;
  reference: string;
}

export interface BodyCompositionBlock {
  weightKg: number;
  heightCm: number;
  bmi: number;
  targetWeightKg: number;
  weightLossNeededKg: number;
  bmiStatus: LiverHealthStatus;
}

export interface LiverFatBlock {
  capDbm: number;
  steatosisGrade: string;
  stageLabel: string;
  stages: { grade: string; label: string; range: string; active: boolean }[];
}

export interface PrescriptionColumn {
  title: string;
  tone: 'positive' | 'negative' | 'neutral';
  items: string[];
}

export interface ActionPlanItem {
  id: string;
  label: string;
  completed?: boolean;
}

export interface AISummaryCard {
  id: string;
  icon: 'trophy' | 'heart' | 'calendar' | 'target';
  title: string;
  value: string;
  subtitle?: string;
}

export interface LiverHealthReport {
  id: string;
  orderId: string;
  header: LiverHealthReportHeader;
  liverHealthScore: LiverHealthScoreBlock;
  roadmap: LiverRoadmapBlock;
  fibroScan: FibroScanGaugeBlock;
  liverAge: LiverAgeBlock;
  progressionRisks: ProgressionRiskItem[];
  atAGlance: AtAGlanceRow[];
  keyInsight: string;
  biomarkers: BiomarkerRow[];
  nonInvasiveScores: NonInvasiveScoreRow[];
  bodyComposition: BodyCompositionBlock;
  liverFat: LiverFatBlock;
  prescription: PrescriptionColumn[];
  actionPlan: ActionPlanItem[];
  aiSummary: string;
  aiSummaryCards: AISummaryCard[];
  clinicalReferences: string[];
  generatedBy: 'ai-hybrid' | 'manual';
  createdAt: string;
}

export const LIVER_STATUS_COLORS: Record<LiverHealthStatus, string> = {
  optimal: '#22c55e',
  normal: '#4ade80',
  caution: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

export const LIVER_STATUS_BG: Record<LiverHealthStatus, string> = {
  optimal: 'bg-green-100 text-green-800',
  normal: 'bg-emerald-100 text-emerald-800',
  caution: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};
