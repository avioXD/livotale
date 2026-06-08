import type { AIExtractionStatus } from '@/types/aiExtraction';

export type LabReportFinalStatus = 'pending' | 'verified' | 'rejected';

export interface LabReportUpload {
  id: string;
  orderId: string;
  patientId: string;
  partnerLabId: string;
  partnerLabName: string;
  fileName: string;
  fileUrl: string;
  fileId: string;
  uploadedBy: string;
  uploadedAt: string;
  extractionStatus: AIExtractionStatus;
  finalStatus: LabReportFinalStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  /** Partner lab emailed PDF to operations */
  sourceType?: 'partner_lab_email';
  emailFrom?: string | null;
  emailSubject?: string | null;
  emailReceivedAt?: string | null;
  fileSizeBytes?: number | null;
}

/** Ops uploads the PDF attachment received from partner lab email */
export interface UploadLabReportFromEmailInput {
  file: File;
  emailFrom?: string;
  emailSubject?: string;
  emailReceivedAt?: string;
  uploadedBy?: string;
}
