export type FibrosisScanSource = 'manual' | 'device' | 'upload';

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
}

export type FibrosisScanInput = Omit<
  FibrosisScanRecord,
  'id' | 'orderId' | 'patientId' | 'locked' | 'createdAt' | 'updatedAt'
>;
