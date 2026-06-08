import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import {
  demoAttachUser,
  demoCreateInvite,
  demoGetInvite,
  demoGetStatusForUser,
  demoListInvites,
  demoMarkLinkSent,
  demoSubmitProfile,
} from './staffOnboarding.mock';
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
    return mockOrApi(
      () => demoCreateInvite(roleKey, payload),
      () => this.post<StaffOnboardingInvite>(`/admin/staff/${slug}/onboard`, payload),
    );
  }

  async listInvites(roleKey: StaffRoleKey): Promise<StaffOnboardingInvite[]> {
    const slug = STAFF_ROLE_SLUGS[roleKey];
    return mockOrApi(
      () => demoListInvites(roleKey),
      () => this.get<StaffOnboardingInvite[]>(`/admin/staff/${slug}/onboard`),
    );
  }

  async getInvite(token: string): Promise<StaffOnboardingInvite> {
    return mockOrApi(
      () => {
        const invite = demoGetInvite(token);
        if (!invite) throw new Error('Onboarding invite not found');
        return invite;
      },
      () => this.get<StaffOnboardingInvite>(`/staff/onboard/${token}`),
    );
  }

  async sendLink(token: string): Promise<StaffOnboardingInvite> {
    return mockOrApi(
      () => demoMarkLinkSent(token) ?? demoGetInvite(token)!,
      () => this.post<StaffOnboardingInvite>(`/admin/staff/onboard/${token}/send-link`),
    );
  }

  async attachUser(token: string, userId?: string): Promise<StaffOnboardingInvite> {
    return mockOrApi(
      () => demoAttachUser(token, userId ?? 'demo-current-user') ?? demoGetInvite(token)!,
      () => this.post<StaffOnboardingInvite>(`/staff/onboard/${token}/attach`),
    );
  }

  async submitProfile(
    token: string,
    body: { profileComplete: boolean; verificationStatus: string },
  ): Promise<StaffOnboardingInvite> {
    return mockOrApi(
      () => demoSubmitProfile(token, body) ?? demoGetInvite(token)!,
      () =>
        this.post<StaffOnboardingInvite>(`/staff/onboard/${token}/submit`, {
          ...body,
          employmentStatus: body.profileComplete && body.verificationStatus === 'verified' ? 'active' : 'inactive',
        }),
    );
  }

  async getStatus(userId?: string): Promise<StaffOnboardingStatus> {
    return mockOrApi(
      () => {
        if (userId) return demoGetStatusForUser(userId);
        return {
          required: false,
          profileComplete: true,
          verificationComplete: true,
          employmentStatus: 'active',
          canAccessApp: true,
        };
      },
      () => this.get<StaffOnboardingStatus>('/staff/onboarding/status'),
    );
  }
}

export const staffOnboardingService = new StaffOnboardingService();
