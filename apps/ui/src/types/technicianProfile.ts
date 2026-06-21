export type TechnicianDocumentType =
  | 'aadhaar'
  | 'pan'
  | 'driving_license'
  | 'police_verification'
  | 'medical_certificate'
  | 'employment_contract'
  | 'nda'
  | 'training_certificate'
  | 'other';

export type ComplianceDocStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export interface TechnicianEmployeeDetails {
  homeLine1: string | null;
  homeLine2: string | null;
  homeCity: string | null;
  homeState: string | null;
  homePincode: string | null;
  emergencyContactName: string | null;
  emergencyContactMobile: string | null;
  emergencyContactRelation: string | null;
  qualification: string | null;
  certification: string | null;
  vehicleType: string | null;
  vehicleNumber: string | null;
  joinedOn: string | null;
  bankAccountLast4: string | null;
  additionalNotes: string | null;
}

export interface TechnicianComplianceDocument {
  id: string;
  documentType: TechnicianDocumentType;
  documentNumber: string | null;
  fileId: string | null;
  storageUrl: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  status: ComplianceDocStatus;
  verifiedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface TechnicianServicePincode {
  pincode: string;
  isActive: boolean;
}

export interface TechnicianFullProfile {
  id: string;
  userId: string;
  employeeCode: string;
  fullName: string;
  email: string | null;
  mobile: string | null;
  gender: string | null;
  dob: string | null;
  profilePhotoUrl: string | null;
  clinicId: string | null;
  cityId: string | null;
  verificationStatus: string;
  status: string;
  technicianType: string | null;
  maxAppointmentsPerDay: number | null;
  serviceZone: string | null;
  rating: number | null;
  employee: TechnicianEmployeeDetails | null;
  servicePincodes: TechnicianServicePincode[];
  documents: TechnicianComplianceDocument[];
}

export const TECHNICIAN_DOCUMENT_LABELS: Record<TechnicianDocumentType, string> = {
  aadhaar: 'Aadhaar',
  pan: 'PAN card',
  driving_license: 'Driving licence',
  police_verification: 'Police verification',
  medical_certificate: 'Medical fitness certificate',
  employment_contract: 'Employment contract',
  nda: 'NDA / confidentiality',
  training_certificate: 'Training certificate',
  other: 'Other',
};
