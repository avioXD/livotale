export type FinalReportType =
  | 'fibrosis_scan_only'
  | 'combined_scan_pathology'
  | 'combined_with_consultation';

export type FinalReportStatus = 'draft' | 'generated' | 'published' | 'locked';

export interface FinalReport {
  id: string;
  orderId: string;
  patientId: string;
  reportType: FinalReportType;
  reportNumber: string;
  status: FinalReportStatus;
  pdfUrl?: string | null;
  fileId?: string | null;
  generatedAt?: string | null;
  publishedAt?: string | null;
  authorizedBy?: string | null;
  version: number;
  qrCodeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportPreviewSection {
  title: string;
  rows: { label: string; value: string; flag?: string }[];
}

export interface FinalReportPreviewData {
  reportNumber: string;
  reportType: FinalReportType;
  reportTypeLabel: string;
  patientName: string;
  patientPhone: string;
  orderNumber: string;
  packageName: string;
  generatedAt: string;
  authorizedBy: string;
  qrCodeId: string;
  fibrosisSection?: ReportPreviewSection;
  pathologySection?: ReportPreviewSection;
  interpretation: string;
  disclaimer: string;
  footer: string;
}

export const REPORT_TYPE_LABELS: Record<FinalReportType, string> = {
  fibrosis_scan_only: 'Liver Fibrosis Scan Report',
  combined_scan_pathology: 'Combined Fibrosis Scan + Pathology Report',
  combined_with_consultation: 'Combined Fibrosis Scan + Pathology Report',
};
