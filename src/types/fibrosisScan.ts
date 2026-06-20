import type { LiverCareOrder } from '@/types/serviceOrder';

export type FibrosisScanSource = 'manual' | 'device' | 'upload';

export type ScanReportDocumentType = 'scanner_pdf' | 'report_photo' | 'letter';

export type TechnicianVisitStep =
  | 'assigned'
  | 'visit_started'
  | 'reached_location'
  | 'scan_in_progress'
  | 'scan_completed'
  | 'unable_to_complete';

export interface FibrosisScanRecord {
  id: string;
  orderId: string;
  patientId: string;
  /** Number of times scan was re-captured after initial session. */
  rescanCount?: number;
  liverStiffnessKpa: number;
  capDbm: number;
  iqr: number;
  iqrMedianPercent: number;
  validMeasurements: number;
  totalMeasurements: number;
  successRatePercent: number;
  probeType: 'M' | 'XL';
  scanAt: string;
  operatorName: string;
  deviceSerial: string;
  fastingStatus: boolean;
  bmi: number;
  interpretation: string;
  steatosisGrade: string;
  fibrosisStage: string;
  remarks?: string | null;
  scanFileId?: string | null;
  scanFileUrl?: string | null;
  scanReportDocumentType?: ScanReportDocumentType | null;
  source: FibrosisScanSource;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TechnicianOrderVisit {
  orderId: string;
  technicianId: string;
  visitStep: TechnicianVisitStep;
  unableReason?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  patientEmail?: string | null;
  /** Incremented each time technician requests a rescan on this order. */
  rescanCount?: number;
  visitStartedAt?: string | null;
  reachedAt?: string | null;
  completedAt?: string | null;
  /** OTP sent to patient to confirm visit / scan completion */
  visitCompletionOtpSentAt?: string | null;
  visitCompletionOtpVerified?: boolean;
  visitCompletionOtpVerifiedAt?: string | null;
  patientIntakeOtpSentAt?: string | null;
  retryAfterSeconds?: number;
  demoOtp?: string;
}

export interface TechnicianOrderDetail extends LiverCareOrder {
  patientEmail?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  visitStep?: TechnicianVisitStep;
}

export type FibrosisScanInput = Omit<
  FibrosisScanRecord,
  'id' | 'orderId' | 'patientId' | 'locked' | 'createdAt' | 'updatedAt'
>;
