import { MOCK_SEED_PATIENT_ID } from '@/services/auth/auth.mock';
import type {
  ConsentPurpose,
  InsuranceDetails,
  UpdateBasicPayload,
  UpdateEmergencyContactPayload,
  UserConsent,
  UserProfile,
} from '@/types';

let mockProfile: UserProfile = {
  basic: {
    id: '00000000-0000-4000-8000-000000000101',
    username: 'rohan.mock',
    full_name: 'Rohan Mehta',
    email: 'rohan.mock@livotale.test',
    mobile: '+919900000001',
    gender: 'male',
    dob: '1984-03-12',
    profile_photo_url: null,
    twofa_enabled: false,
    last_login_at: new Date().toISOString(),
  },
  patient: {
    id: MOCK_SEED_PATIENT_ID,
    patient_code: 'MR-21847',
    journey_status: 'visit_booked',
  },
  emergencyContact: {
    name: 'Anita Mehta',
    mobile: '+919900009999',
  },
  addresses: [
    {
      id: 'addr-mock-1',
      address_type: 'home',
      line1: 'A-1402, Lodha Park',
      line2: 'Lower Parel',
      city_id: null,
      pincode: '400013',
      is_default: true,
    },
  ],
  familyMembers: [
    {
      id: 'fm-1',
      full_name: 'Anita Mehta',
      relationship: 'mother',
      mobile: '+919900009999',
      email: null,
      dob: null,
      is_emergency_contact: true,
      notes: 'Type 2 diabetes',
    },
  ],
  insurance: [
    {
      id: 'ins-1',
      provider_name: 'Star Health',
      policy_number: 'SH-2024-88421',
      group_number: null,
      valid_from: '2024-04-01',
      valid_until: '2025-03-31',
      is_primary: true,
    },
  ],
  identityVerification: [],
};

const CONSENT_PURPOSES: ConsentPurpose[] = [
  { id: 'cp-1', code: 'data_processing', name: 'Health data processing', description: 'Allow Livotale to process your health records.', is_sensitive: true },
  { id: 'cp-2', code: 'teleconsultation', name: 'Teleconsultation recording', description: 'Consent for secure teleconsultation sessions.', is_sensitive: false },
];

let mockConsents: UserConsent[] = [
  {
    id: 'uc-1',
    purpose_id: 'cp-1',
    purpose_code: 'data_processing',
    purpose_name: 'Health data processing',
    accepted: true,
    accepted_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    withdrawn_at: null,
  },
];

export function mockGetProfile(): UserProfile {
  return JSON.parse(JSON.stringify(mockProfile)) as UserProfile;
}

export function mockUpdateBasic(payload: UpdateBasicPayload): UserProfile {
  mockProfile = {
    ...mockProfile,
    basic: {
      ...mockProfile.basic,
      full_name: payload.fullName ?? mockProfile.basic.full_name,
      email: payload.email ?? mockProfile.basic.email,
      mobile: payload.mobile ?? mockProfile.basic.mobile,
      gender: payload.gender ?? mockProfile.basic.gender,
      dob: payload.dob ?? mockProfile.basic.dob,
    },
  };
  return mockGetProfile();
}

export function mockUpdateEmergencyContact(payload: UpdateEmergencyContactPayload): UserProfile {
  mockProfile = {
    ...mockProfile,
    emergencyContact: { name: payload.name, mobile: payload.mobile },
  };
  return mockGetProfile();
}

export function mockUpsertInsurance(payload: {
  providerName: string;
  policyNumber: string;
  groupNumber?: string;
  validFrom?: string;
  validUntil?: string;
  isPrimary?: boolean;
}): InsuranceDetails {
  const existing = mockProfile.insurance[0];
  const updated: InsuranceDetails = {
    id: existing?.id ?? `ins-${Date.now()}`,
    provider_name: payload.providerName,
    policy_number: payload.policyNumber,
    group_number: payload.groupNumber ?? null,
    valid_from: payload.validFrom ?? null,
    valid_until: payload.validUntil ?? null,
    is_primary: payload.isPrimary ?? true,
  };
  mockProfile = {
    ...mockProfile,
    insurance: [updated, ...mockProfile.insurance.filter((i) => i.id !== updated.id)],
  };
  return { ...updated };
}

export function mockListConsents(): UserConsent[] {
  return [...mockConsents];
}

export function mockListConsentPurposes(): ConsentPurpose[] {
  return [...CONSENT_PURPOSES];
}

export function mockAcceptConsent(purposeId: string): UserConsent[] {
  const purpose = CONSENT_PURPOSES.find((p) => p.id === purposeId);
  if (!purpose) throw new Error('Consent purpose not found');
  if (!mockConsents.some((c) => c.purpose_id === purposeId)) {
    mockConsents = [
      ...mockConsents,
      {
        id: `uc-${Date.now()}`,
        purpose_id: purpose.id,
        purpose_code: purpose.code,
        purpose_name: purpose.name,
        accepted: true,
        accepted_at: new Date().toISOString(),
        withdrawn_at: null,
      },
    ];
  }
  return mockListConsents();
}
