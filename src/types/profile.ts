export interface ProfileBasic {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  mobile: string | null;
  gender: string | null;
  dob: string | null;
  profile_photo_url: string | null;
  twofa_enabled?: boolean;
  last_login_at?: string | null;
}

export interface EmergencyContact {
  name: string | null;
  mobile: string | null;
}

export interface ProfileAddress {
  id: string;
  address_type: string;
  line1: string;
  line2: string | null;
  city_id: string | null;
  pincode: string | null;
  is_default: boolean;
}

export interface FamilyMember {
  id: string;
  full_name: string;
  relationship: string;
  mobile: string | null;
  email: string | null;
  dob: string | null;
  is_emergency_contact: boolean;
  notes: string | null;
}

export interface InsuranceDetails {
  id: string;
  provider_name: string;
  policy_number: string;
  group_number: string | null;
  valid_from: string | null;
  valid_until: string | null;
  is_primary: boolean;
}

export interface IdentityVerification {
  id: string;
  document_type: string;
  document_number: string | null;
  status: string;
  verified_at: string | null;
  created_at: string;
}

export interface UserProfile {
  basic: ProfileBasic;
  patient: Record<string, unknown> | null;
  emergencyContact: EmergencyContact | null;
  addresses: ProfileAddress[];
  familyMembers: FamilyMember[];
  insurance: InsuranceDetails[];
  identityVerification: IdentityVerification[];
}

export interface UpdateBasicPayload {
  fullName?: string;
  email?: string;
  mobile?: string;
  gender?: string;
  dob?: string;
}

export interface UpdateEmergencyContactPayload {
  name: string;
  mobile: string;
}

export interface ConsentPurpose {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_sensitive: boolean;
}

export interface UserConsent {
  id: string;
  purpose_id: string;
  purpose_code: string;
  purpose_name: string;
  accepted: boolean;
  accepted_at: string | null;
  withdrawn_at: string | null;
}
