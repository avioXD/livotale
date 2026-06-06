import { BaseApiService } from '@/services/base';
import type {
  ConsentPurpose,
  InsuranceDetails,
  UpdateBasicPayload,
  UpdateEmergencyContactPayload,
  UserConsent,
  UserProfile,
} from '@/types';

class ProfileService extends BaseApiService {
  async getProfile(): Promise<UserProfile> {
    return this.get('/profile');
  }

  async updateBasic(payload: UpdateBasicPayload): Promise<UserProfile> {
    return this.patch('/profile/basic', {
      fullName: payload.fullName,
      email: payload.email,
      mobile: payload.mobile,
      gender: payload.gender,
      dob: payload.dob,
    });
  }

  async updateEmergencyContact(payload: UpdateEmergencyContactPayload): Promise<UserProfile> {
    return this.patch('/profile/emergency-contact', payload);
  }

  async upsertInsurance(payload: {
    providerName: string;
    policyNumber: string;
    groupNumber?: string;
    validFrom?: string;
    validUntil?: string;
    isPrimary?: boolean;
  }): Promise<InsuranceDetails> {
    return this.patch('/profile/insurance', payload);
  }

  async listConsents(): Promise<UserConsent[]> {
    return this.get('/consent/mine');
  }

  async listConsentPurposes(): Promise<ConsentPurpose[]> {
    return this.get('/consent/purposes');
  }

  async acceptConsent(purposeId: string): Promise<UserConsent[]> {
    return this.post('/consent/accept', { purposeId });
  }
}

export const profileService = new ProfileService();
