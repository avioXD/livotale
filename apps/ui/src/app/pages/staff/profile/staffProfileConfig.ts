import type { StaffRoleKey } from '@/types/staffHub';
import type { StaffDocumentType } from '@/types/staffProfile';

export interface StaffFieldPermission {
  key: string;
  label: string;
  selfEditable: boolean;
  adminEditable: boolean;
  section: 'employment' | 'address' | 'role';
}

export interface StaffRoleProfileConfig {
  role: StaffRoleKey;
  label: string;
  requiredDocuments: StaffDocumentType[];
  optionalDocuments: StaffDocumentType[];
  fields: StaffFieldPermission[];
}

const BASE_ADDRESS_FIELDS: StaffFieldPermission[] = [
  { key: 'homeLine1', label: 'Address line 1', selfEditable: true, adminEditable: true, section: 'address' },
  { key: 'homeLine2', label: 'Address line 2', selfEditable: true, adminEditable: true, section: 'address' },
  { key: 'homeCity', label: 'City', selfEditable: true, adminEditable: true, section: 'address' },
  { key: 'homeState', label: 'State', selfEditable: true, adminEditable: true, section: 'address' },
  { key: 'homePincode', label: 'Pincode', selfEditable: true, adminEditable: true, section: 'address' },
  { key: 'emergencyContactName', label: 'Emergency contact name', selfEditable: true, adminEditable: true, section: 'address' },
  { key: 'emergencyContactMobile', label: 'Emergency mobile', selfEditable: true, adminEditable: true, section: 'address' },
  { key: 'emergencyContactRelation', label: 'Relation', selfEditable: true, adminEditable: true, section: 'address' },
];

/** Identity fields edited on the Basic info tab, not under Employment for self-service. */
export const BASIC_IDENTITY_FIELD_KEYS = new Set([
  'fullName',
  'email',
  'mobile',
  'gender',
  'dob',
]);

const BASE_EMPLOYMENT_FIELDS: StaffFieldPermission[] = [
  { key: 'fullName', label: 'Full name', selfEditable: false, adminEditable: true, section: 'employment' },
  { key: 'email', label: 'Email', selfEditable: false, adminEditable: true, section: 'employment' },
  { key: 'mobile', label: 'Mobile', selfEditable: false, adminEditable: true, section: 'employment' },
  { key: 'gender', label: 'Gender', selfEditable: false, adminEditable: true, section: 'employment' },
  { key: 'dob', label: 'Date of birth', selfEditable: false, adminEditable: true, section: 'employment' },
  { key: 'joinedOn', label: 'Joined on', selfEditable: false, adminEditable: true, section: 'employment' },
  { key: 'qualification', label: 'Qualification', selfEditable: false, adminEditable: true, section: 'employment' },
  { key: 'certification', label: 'Certification', selfEditable: false, adminEditable: true, section: 'employment' },
  { key: 'additionalNotes', label: 'HR notes', selfEditable: false, adminEditable: true, section: 'employment' },
  { key: 'verificationStatus', label: 'Verification status', selfEditable: false, adminEditable: true, section: 'employment' },
  { key: 'status', label: 'Employment status', selfEditable: false, adminEditable: true, section: 'employment' },
];

export const STAFF_ROLE_PROFILE_CONFIGS: Record<StaffRoleKey, StaffRoleProfileConfig> = {
  technician: {
    role: 'technician',
    label: 'Technician',
    requiredDocuments: [
      'aadhaar', 'pan', 'driving_license', 'police_verification',
      'medical_certificate', 'employment_contract', 'nda', 'training_certificate',
    ],
    optionalDocuments: ['other'],
    fields: [
      ...BASE_EMPLOYMENT_FIELDS,
      { key: 'vehicleType', label: 'Vehicle type', selfEditable: true, adminEditable: true, section: 'employment' },
      { key: 'vehicleNumber', label: 'Vehicle number', selfEditable: true, adminEditable: true, section: 'employment' },
      ...BASE_ADDRESS_FIELDS,
    ],
  },
  doctor: {
    role: 'doctor',
    label: 'Doctor',
    requiredDocuments: [
      'medical_registration', 'degree_certificate', 'pan', 'aadhaar',
      'indemnity_insurance', 'employment_contract', 'nda',
    ],
    optionalDocuments: ['medical_certificate', 'other'],
    fields: [
      ...BASE_EMPLOYMENT_FIELDS,
      { key: 'registrationNumber', label: 'Medical registration', selfEditable: false, adminEditable: true, section: 'role' },
      { key: 'specialization', label: 'Specialization', selfEditable: false, adminEditable: true, section: 'role' },
      { key: 'languagesKnown', label: 'Languages known', selfEditable: true, adminEditable: true, section: 'role' },
      { key: 'clinicOrOrgName', label: 'Clinic / hospital', selfEditable: true, adminEditable: true, section: 'role' },
      ...BASE_ADDRESS_FIELDS,
    ],
  },
  lab_partner: {
    role: 'lab_partner',
    label: 'Lab partner',
    requiredDocuments: ['lab_registration', 'nabl_certificate', 'pan', 'gst_certificate', 'employment_contract', 'nda'],
    optionalDocuments: ['aadhaar', 'other'],
    fields: [
      ...BASE_EMPLOYMENT_FIELDS,
      { key: 'registrationNumber', label: 'Lab registration number', selfEditable: false, adminEditable: true, section: 'role' },
      { key: 'clinicOrOrgName', label: 'Lab / organisation name', selfEditable: false, adminEditable: true, section: 'role' },
      ...BASE_ADDRESS_FIELDS,
    ],
  },
  dietician: {
    role: 'dietician',
    label: 'Dietician',
    requiredDocuments: ['professional_registration', 'degree_certificate', 'pan', 'aadhaar', 'employment_contract'],
    optionalDocuments: ['training_certificate', 'nda', 'other'],
    fields: [
      ...BASE_EMPLOYMENT_FIELDS,
      { key: 'registrationNumber', label: 'RD registration', selfEditable: false, adminEditable: true, section: 'role' },
      { key: 'specialization', label: 'Specialization', selfEditable: true, adminEditable: true, section: 'role' },
      ...BASE_ADDRESS_FIELDS,
    ],
  },
  health_coach: {
    role: 'health_coach',
    label: 'Health coach',
    requiredDocuments: ['coaching_certification', 'pan', 'aadhaar', 'employment_contract', 'nda'],
    optionalDocuments: ['degree_certificate', 'training_certificate', 'other'],
    fields: [
      ...BASE_EMPLOYMENT_FIELDS,
      { key: 'certification', label: 'Coaching certification', selfEditable: true, adminEditable: true, section: 'role' },
      ...BASE_ADDRESS_FIELDS,
    ],
  },
  pharmacy: {
    role: 'pharmacy',
    label: 'Pharmacy',
    requiredDocuments: ['drug_license', 'gst_certificate', 'pan', 'shop_establishment', 'employment_contract'],
    optionalDocuments: ['aadhaar', 'nda', 'other'],
    fields: [
      ...BASE_EMPLOYMENT_FIELDS,
      { key: 'registrationNumber', label: 'Drug licence number', selfEditable: false, adminEditable: true, section: 'role' },
      { key: 'clinicOrOrgName', label: 'Pharmacy / hub name', selfEditable: false, adminEditable: true, section: 'role' },
      ...BASE_ADDRESS_FIELDS,
    ],
  },
  operations: {
    role: 'operations',
    label: 'Operations',
    requiredDocuments: ['aadhaar', 'pan', 'employment_contract', 'nda'],
    optionalDocuments: ['degree_certificate', 'police_verification', 'other'],
    fields: [
      ...BASE_EMPLOYMENT_FIELDS,
      {
        key: 'assignedServiceZoneIds',
        label: 'Service zones',
        selfEditable: false,
        adminEditable: true,
        section: 'role',
      },
      {
        key: 'assignedPincodes',
        label: 'Assigned pincodes',
        selfEditable: false,
        adminEditable: true,
        section: 'role',
      },
      {
        key: 'cityManagerServiceZoneIds',
        label: 'City manager promotion',
        selfEditable: false,
        adminEditable: true,
        section: 'role',
      },
      ...BASE_ADDRESS_FIELDS,
    ],
  },
  super_admin: {
    role: 'super_admin',
    label: 'Super Admin',
    requiredDocuments: ['aadhaar', 'pan', 'employment_contract', 'nda'],
    optionalDocuments: ['degree_certificate', 'police_verification', 'other'],
    fields: [
      ...BASE_EMPLOYMENT_FIELDS,
      { key: 'clinicOrOrgName', label: 'Department / scope', selfEditable: false, adminEditable: true, section: 'role' },
      ...BASE_ADDRESS_FIELDS,
    ],
  },
  city_manager: {
    role: 'city_manager',
    label: 'City Manager',
    requiredDocuments: ['aadhaar', 'pan', 'employment_contract', 'nda'],
    optionalDocuments: ['degree_certificate', 'police_verification', 'other'],
    fields: [
      ...BASE_EMPLOYMENT_FIELDS,
      { key: 'assignedCity', label: 'Assigned city', selfEditable: false, adminEditable: true, section: 'role' },
      {
        key: 'assignedPincodes',
        label: 'Assigned pincodes (comma-separated)',
        selfEditable: false,
        adminEditable: true,
        section: 'role',
      },
      ...BASE_ADDRESS_FIELDS,
    ],
  },
};

export function staffProfileConfig(role: StaffRoleKey): StaffRoleProfileConfig {
  return STAFF_ROLE_PROFILE_CONFIGS[role];
}

export function canEditStaffField(
  role: StaffRoleKey,
  fieldKey: string,
  actor: 'self' | 'admin',
  viewMode: 'view' | 'edit',
): boolean {
  if (viewMode === 'view') return false;
  const field = STAFF_ROLE_PROFILE_CONFIGS[role].fields.find((f) => f.key === fieldKey);
  if (!field) return actor === 'admin';
  return actor === 'admin' ? field.adminEditable : field.selfEditable;
}

export function allDocumentTypesForRole(role: StaffRoleKey): StaffDocumentType[] {
  const cfg = STAFF_ROLE_PROFILE_CONFIGS[role];
  return [...cfg.requiredDocuments, ...cfg.optionalDocuments];
}
