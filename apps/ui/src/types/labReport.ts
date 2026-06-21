import type { AIExtractionStatus } from '@/types/aiExtraction';
import type { SampleDispatchStatus } from '@/types/sampleDispatch';

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

export interface LabReportQueueRow {
  id: string;
  orderId: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  packageCode: string;
  partnerLabId: string | null;
  partnerLabName: string | null;
  dispatchStatus: SampleDispatchStatus | 'not_started';
  extractionStatus: AIExtractionStatus | null;
  reportFileName: string | null;
  reportUploadedAt: string | null;
  courierRef: string | null;
  pathologyExternalAppointmentId?: string | null;
  pathologyVisitOutcome?: 'visited' | 'no_show' | null;
  pathologyVisitConfirmedAt?: string | null;
  updatedAt: string;
}

/** Ops uploads the PDF attachment received from partner lab email */
export interface UploadLabReportFromEmailInput {
  file: File;
  emailFrom?: string;
  emailSubject?: string;
  emailReceivedAt?: string;
  uploadedBy?: string;
}
