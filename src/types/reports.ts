export type ReportCriticality = 'normal' | 'low' | 'moderate' | 'high' | 'critical';

export interface ReportListItem {
  reportKey: string;
  reportCode: string;
  reportKind: string;
  title: string;
  reportDate: string | null;
  createdAt: string;
  verified: boolean;
  fileName: string | null;
  metricCount: number;
  overallCriticality: ReportCriticality;
  summary: string;
}

export interface ReportMetric {
  code: string;
  name: string;
  value: string | number;
  unit: string | null;
  referenceRange: string | null;
  criticality: ReportCriticality;
  color: string;
  bodyRegion: string;
  bodyRegionLabel: string;
}

export interface ReportSection {
  id: string;
  title: string;
  criticality: ReportCriticality;
  metrics: ReportMetric[];
}

export interface BodyMapRegion {
  regionId: string;
  label: string;
  svgRegion: string;
  criticality: ReportCriticality;
  color: string;
  metrics: {
    code: string;
    name: string;
    value: string | number;
    unit: string | null;
    criticality: ReportCriticality;
    color: string;
  }[];
}

export interface ReportPdfInfo {
  fileName: string | null;
  mimeType: string | null;
  storageUrl: string | null;
  embeddable: boolean;
  previewUrl?: string;
}

export interface ReportDetail {
  reportKey: string;
  reportCode: string;
  reportKind: string;
  title: string;
  reportDate: string | null;
  createdAt: string;
  verified: boolean;
  overallCriticality: ReportCriticality;
  metrics: ReportMetric[];
  sections: ReportSection[];
  bodyMap: BodyMapRegion[];
  pdf: ReportPdfInfo;
  notes?: string | null;
}

export const CRITICALITY_LABELS: Record<ReportCriticality, string> = {
  normal: 'Normal',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  critical: 'Critical',
};

export const CRITICALITY_BADGE_CLASS: Record<ReportCriticality, string> = {
  normal: 'bg-green-100 text-green-800 border-green-200',
  low: 'bg-lime-100 text-lime-800 border-lime-200',
  moderate: 'bg-amber-100 text-amber-800 border-amber-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

export function reportKindLabel(kind: string) {
  switch (kind) {
    case 'lab_report':
      return 'Lab Panel';
    case 'fibroscan_report':
      return 'FibroScan';
    case 'historical_report':
      return 'Historical';
    default:
      return kind.replace(/_/g, ' ');
  }
}
