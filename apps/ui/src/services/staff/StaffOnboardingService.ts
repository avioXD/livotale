import { BaseApiService } from '@/services/base';
import { STAFF_ROLE_SLUGS } from '@/app/pages/admin/staff/staffHubConfig';
import type { StaffRoleKey } from '@/types/staffHub';
import type {
  CreateStaffInvitePayload,
  StaffOnboardingInvite,
  StaffOnboardingStatus,
} from '@/types/staffOnboarding';

class StaffOnboardingService extends BaseApiService {
  async createInvite(roleKey: StaffRoleKey, payload: CreateStaffInvitePayload): Promise<StaffOnboardingInvite> {
    const slug = STAFF_ROLE_SLUGS[roleKey];
    return this.post<StaffOnboardingInvite>(`/admin/staff/${slug}/onboard`, payload)
  }

  async listInvites(roleKey: StaffRoleKey): Promise<StaffOnboardingInvite[]> {
    const slug = STAFF_ROLE_SLUGS[roleKey];
    return this.get<StaffOnboardingInvite[]>(`/admin/staff/${slug}/onboard`)
  }

  async getInvite(token: string): Promise<StaffOnboardingInvite> {
    return this.get<StaffOnboardingInvite>(`/staff/onboard/${token}`)
  }

  async sendLink(token: string): Promise<StaffOnboardingInvite> {
    return this.post<StaffOnboardingInvite>(`/admin/staff/onboard/${token}/send-link`)
  }

  async attachUser(token: string, _userId?: string): Promise<StaffOnboardingInvite> {
    return this.post<StaffOnboardingInvite>(`/staff/onboard/${token}/attach`)
  }

  async submitProfile(
    token: string,
    body: { profileComplete: boolean; verificationStatus: string },
  ): Promise<StaffOnboardingInvite> {
    return this.post<StaffOnboardingInvite>(`/staff/onboard/${token}/submit`, {
          ...body,
          employmentStatus: body.profileComplete && body.verificationStatus === 'verified' ? 'active' : 'inactive',
        })
  }

  async getStatus(_userId?: string): Promise<StaffOnboardingStatus> {
    return this.get<StaffOnboardingStatus>('/staff/onboarding/status')
  }
}

export const staffOnboardingService = new StaffOnboardingService();
