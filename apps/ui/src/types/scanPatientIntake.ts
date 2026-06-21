export type PatientSex = 'male' | 'female' | 'other';

export interface ComorbidityFlags {
  bloodPressure: boolean;
  sugar: boolean;
  thyroid: boolean;
}

export type OperatorVerificationStatus = 'pending' | 'approved' | 'rejected';

export interface ScanPatientIntake {
  orderId: string;
  name: string;
  sex: PatientSex;
  age: number;
  phone: string;
  weightKg?: number | null;
  heightMeters?: number | null;
  comorbidities: ComorbidityFlags;
  /** Operator-entered at booking */
  operatorEnteredAt?: string | null;
  operatorEnteredBy?: string | null;
  /** Technician field verification */
  phoneOtpVerified?: boolean;
  verifiedPhone?: string | null;
  operatorPhoneVerifiedAt?: string | null;
  technicianVerifiedAt?: string | null;
  technicianVerifiedBy?: string | null;
  /** Demographics entered on the FibroScan machine at session start */
  machinePatientName?: string | null;
  machinePatientAge?: number | null;
  machinePatientSex?: PatientSex | null;
  machinePatientPhone?: string | null;
  /** FibroScan machine patient code entered before scan */
  devicePatientCode?: string | null;
  /** Technician submitted FibroScan intake (device code + machine demographics) */
  fibroscanIntakeSubmittedAt?: string | null;
  fibroscanIntakeSubmittedBy?: string | null;
  /** Operator review of technician-submitted patient details */
  operatorVerificationStatus: OperatorVerificationStatus;
  operatorVerifiedAt?: string | null;
  operatorVerifiedBy?: string | null;
  operatorNotes?: string | null;
  /** Operator review of technician-submitted FibroScan intake */
  fibroscanOperatorVerificationStatus?: OperatorVerificationStatus | null;
  fibroscanOperatorVerifiedAt?: string | null;
  fibroscanOperatorVerifiedBy?: string | null;
  fibroscanOperatorNotes?: string | null;
}

export type ScanPatientIntakeInput = Omit<
  ScanPatientIntake,
  | 'orderId'
  | 'operatorEnteredAt'
  | 'operatorEnteredBy'
  | 'phoneOtpVerified'
  | 'verifiedPhone'
  | 'operatorPhoneVerifiedAt'
  | 'technicianVerifiedAt'
  | 'technicianVerifiedBy'
  | 'machinePatientName'
  | 'machinePatientAge'
  | 'machinePatientSex'
  | 'machinePatientPhone'
  | 'devicePatientCode'
  | 'fibroscanIntakeSubmittedAt'
  | 'fibroscanIntakeSubmittedBy'
  | 'operatorVerificationStatus'
  | 'operatorVerifiedAt'
  | 'operatorVerifiedBy'
  | 'operatorNotes'
  | 'fibroscanOperatorVerificationStatus'
  | 'fibroscanOperatorVerifiedAt'
  | 'fibroscanOperatorVerifiedBy'
  | 'fibroscanOperatorNotes'
>;

export interface FibroScanIntakeInput {
  devicePatientCode: string;
  machinePatientName: string;
  machinePatientAge: number;
  machinePatientSex: PatientSex;
  machinePatientPhone: string;
}

export const EMPTY_COMORBIDITIES: ComorbidityFlags = {
  bloodPressure: false,
  sugar: false,
  thyroid: false,
};
