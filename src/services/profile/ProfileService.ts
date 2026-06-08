import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import type {
  ConsentPurpose,
  InsuranceDetails,
  UpdateBasicPayload,
  UpdateEmergencyContactPayload,
  UserConsent,
  UserProfile,
} from '@/types';
import {
  mockAcceptConsent,
  mockGetProfile,
  mockListConsentPurposes,
  mockListConsents,
  mockUpdateBasic,
  mockUpdateEmergencyContact,
  mockUpsertInsurance,
} from './profile.mock';

class ProfileService extends BaseApiService {
  async getProfile(): Promise<UserProfile> {
    return mockOrApi(
      () => mockGetProfile(),
      () => this.get('/profile'),
    );
  }

  async updateBasic(payload: UpdateBasicPayload): Promise<UserProfile> {
    return mockOrApi(
      () => mockUpdateBasic(payload),
      () =>
        this.patch('/profile/basic', {
          fullName: payload.fullName,
          email: payload.email,
          mobile: payload.mobile,
          gender: payload.gender,
          dob: payload.dob,
        }),
    );
  }

  async updateEmergencyContact(payload: UpdateEmergencyContactPayload): Promise<UserProfile> {
    return mockOrApi(
      () => mockUpdateEmergencyContact(payload),
      () => this.patch('/profile/emergency-contact', payload),
    );
  }

  async upsertInsurance(payload: {
    providerName: string;
    policyNumber: string;
    groupNumber?: string;
    validFrom?: string;
    validUntil?: string;
    isPrimary?: boolean;
  }): Promise<InsuranceDetails> {
    return mockOrApi(
      () => mockUpsertInsurance(payload),
      () => this.patch('/profile/insurance', payload),
    );
  }

  async listConsents(): Promise<UserConsent[]> {
    return mockOrApi(
      () => mockListConsents(),
      () => this.get('/consent/mine'),
    );
  }

  async listConsentPurposes(): Promise<ConsentPurpose[]> {
    return mockOrApi(
      () => mockListConsentPurposes(),
      () => this.get('/consent/purposes'),
    );
  }

  async acceptConsent(purposeId: string): Promise<UserConsent[]> {
    return mockOrApi(
      () => mockAcceptConsent(purposeId),
      () => this.post('/consent/accept', { purposeId }),
    );
  }
}

export const profileService = new ProfileService();
