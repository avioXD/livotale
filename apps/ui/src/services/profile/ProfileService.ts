import { storageService } from '@/services/storage/StorageService';
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
    return this.get('/profile')
  }

  async updateBasic(payload: UpdateBasicPayload): Promise<UserProfile> {
    return this.patch('/profile/basic', {
          fullName: payload.fullName,
          mobile: payload.mobile,
          gender: payload.gender,
          dob: payload.dob,
          profilePhotoUrl: payload.profilePhotoUrl,
        })
  }

  async uploadProfilePhoto(file: File, userId: string): Promise<UserProfile> {
    const { storageUrl } = await storageService.uploadFile(file, 'profile', userId);
        return this.patch('/profile/photo', { profilePhotoUrl: storageUrl });
  }

  async updateEmergencyContact(payload: UpdateEmergencyContactPayload): Promise<UserProfile> {
    return this.patch('/profile/emergency-contact', payload)
  }

  async upsertInsurance(payload: {
    providerName: string;
    policyNumber: string;
    groupNumber?: string;
    validFrom?: string;
    validUntil?: string;
    isPrimary?: boolean;
  }): Promise<InsuranceDetails> {
    return this.patch('/profile/insurance', payload)
  }

  async listConsents(): Promise<UserConsent[]> {
    return this.get('/compliance/consent/mine')
  }

  async listConsentPurposes(): Promise<ConsentPurpose[]> {
    return this.get('/compliance/consent/purposes')
  }

  async acceptConsent(purposeId: string): Promise<UserConsent[]> {
    return this.post('/compliance/consent/accept', { purposeId })
  }
}

export const profileService = new ProfileService();
