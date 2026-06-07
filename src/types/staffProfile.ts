import type { StaffRoleKey } from '@/types/staffHub';

export type StaffDocumentType =
  | 'aadhaar'
  | 'pan'
  | 'driving_license'
  | 'police_verification'
  | 'medical_certificate'
  | 'employment_contract'
  | 'nda'
  | 'training_certificate'
  | 'medical_registration'
  | 'degree_certificate'
  | 'indemnity_insurance'
  | 'lab_registration'
  | 'nabl_certificate'
  | 'gst_certificate'
  | 'drug_license'
  | 'shop_establishment'
  | 'professional_registration'
  | 'coaching_certification'
  | 'other';

export type StaffComplianceDocStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export interface StaffComplianceDocument {
  id: string;
  documentType: StaffDocumentType;
  documentNumber: string | null;
  fileId: string | null;
  storageUrl: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  status: StaffComplianceDocStatus;
  verifiedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface StaffEmployeeDetails {
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
  registrationNumber: string | null;
  clinicOrOrgName: string | null;
  specialization: string | null;
  vehicleType: string | null;
  vehicleNumber: string | null;
  joinedOn: string | null;
  bankAccountLast4: string | null;
  additionalNotes: string | null;
}

export interface StaffFullProfile {
  id: string;
  role: StaffRoleKey;
  userId: string | null;
  employeeCode: string | null;
  fullName: string;
  email: string | null;
  mobile: string | null;
  gender: string | null;
  dob: string | null;
  verificationStatus: string;
  status: string;
  employee: StaffEmployeeDetails | null;
  documents: StaffComplianceDocument[];
  /** Role-specific extras (e.g. service pincodes for technician). */
  meta?: Record<string, unknown>;
}

export type StaffProfileActor = 'self' | 'admin';

export const STAFF_DOCUMENT_LABELS: Record<StaffDocumentType, string> = {
  aadhaar: 'Aadhaar',
  pan: 'PAN card',
  driving_license: 'Driving licence',
  police_verification: 'Police verification',
  medical_certificate: 'Medical fitness certificate',
  employment_contract: 'Employment contract',
  nda: 'NDA / confidentiality',
  training_certificate: 'Training certificate',
  medical_registration: 'Medical council registration',
  degree_certificate: 'Degree / qualification certificate',
  indemnity_insurance: 'Professional indemnity insurance',
  lab_registration: 'Lab registration licence',
  nabl_certificate: 'NABL / accreditation certificate',
  gst_certificate: 'GST registration',
  drug_license: 'Drug licence',
  shop_establishment: 'Shop & establishment licence',
  professional_registration: 'Professional registration (RD / coach)',
  coaching_certification: 'Coaching certification',
  other: 'Other',
};
