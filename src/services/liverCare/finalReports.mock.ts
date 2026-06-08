import type { FinalReport } from '@/types/finalReport';

const now = Date.now();
const days = (n: number) => new Date(now - n * 86400000).toISOString();

export const DEFAULT_LETTERHEAD = {
  companyName: 'Livotale Liver Care',
  tagline: 'Advanced Liver Fibrosis Scan & Diagnostics',
  address: 'Mumbai · Bangalore · Pune',
  phone: '+91 98765 43210',
  email: 'care@livotale.test',
  disclaimer:
    'This report is for clinical reference only. Consult a qualified hepatologist for treatment decisions. Not a substitute for emergency medical care.',
};

export const MOCK_FINAL_REPORTS: Record<string, FinalReport> = {
  'lco-1': {
    id: 'fr-lco-1',
    orderId: 'lco-1',
    patientId: 'demo-patient-2',
    reportType: 'fibrosis_scan_only',
    reportNumber: 'RPT-2026-0001',
    status: 'published',
    pdfUrl: '/mock/pdf/report/lco-1.pdf',
    fileId: 'pdf-report-lco-1',
    generatedAt: days(1),
    publishedAt: days(1),
    authorizedBy: 'Dr. Clinic Lead',
    version: 1,
    qrCodeId: 'QR-RPT-2026-0001',
    createdAt: days(1),
    updatedAt: days(1),
  },
  'lco-2': {
    id: 'fr-lco-2',
    orderId: 'lco-2',
    patientId: 'demo-patient-3',
    reportType: 'combined_scan_pathology',
    reportNumber: 'RPT-2026-0002',
    status: 'generated',
    pdfUrl: '/mock/pdf/report/lco-2.pdf',
    fileId: 'pdf-report-lco-2',
    generatedAt: days(1),
    publishedAt: null,
    authorizedBy: 'Dr. Clinic Lead',
    version: 1,
    qrCodeId: 'QR-RPT-2026-0002',
    createdAt: days(1),
    updatedAt: days(1),
  },
  'lco-3': {
    id: 'fr-lco-3',
    orderId: 'lco-3',
    patientId: 'demo-patient-1',
    reportType: 'combined_with_consultation',
    reportNumber: 'RPT-2026-0003',
    status: 'published',
    pdfUrl: '/mock/pdf/report/lco-3.pdf',
    fileId: 'pdf-report-lco-3',
    generatedAt: days(2),
    publishedAt: days(2),
    authorizedBy: 'Dr. Meera Iyer',
    version: 1,
    qrCodeId: 'QR-RPT-2026-0003',
    createdAt: days(2),
    updatedAt: days(2),
  },
};

let reportSeq = 4;

export function nextReportNumber(): string {
  const n = reportSeq++;
  return `RPT-2026-${String(n).padStart(4, '0')}`;
}
