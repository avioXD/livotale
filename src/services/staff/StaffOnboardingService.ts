import { BaseApiService } from '@/services/base';
import { isApiUnavailableError } from '@/data/labSampleDemoData';
import {
  demoAttachUser,
  demoCreateInvite,
  demoGetInvite,
  demoGetStatusForUser,
  demoListInvites,
  demoMarkLinkSent,
  demoSubmitProfile,
} from '@/data/staffOnboardingDemoData';
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
    try {
      return await this.post<StaffOnboardingInvite>(`/admin/staff/${slug}/onboard`, payload);
    } catch (err) {
      if (isApiUnavailableError(err)) {
        return demoCreateInvite(roleKey, payload);
      }
      return demoCreateInvite(roleKey, payload);
    }
  }

  async listInvites(roleKey: StaffRoleKey): Promise<StaffOnboardingInvite[]> {
    const slug = STAFF_ROLE_SLUGS[roleKey];
    try {
      return await this.get<StaffOnboardingInvite[]>(`/admin/staff/${slug}/onboard`);
    } catch {
      return demoListInvites(roleKey);
    }
  }

  async getInvite(token: string): Promise<StaffOnboardingInvite> {
    try {
      return await this.get<StaffOnboardingInvite>(`/staff/onboard/${token}`);
    } catch {
      const invite = demoGetInvite(token);
      if (!invite) throw new Error('Onboarding invite not found');
      return invite;
    }
  }

  async sendLink(token: string): Promise<StaffOnboardingInvite> {
    try {
      return await this.post<StaffOnboardingInvite>(`/admin/staff/onboard/${token}/send-link`);
    } catch {
      return demoMarkLinkSent(token) ?? (await this.getInvite(token));
    }
  }

  async attachUser(token: string, userId?: string): Promise<StaffOnboardingInvite> {
    try {
      return await this.post<StaffOnboardingInvite>(`/staff/onboard/${token}/attach`);
    } catch {
      const uid = userId ?? 'demo-current-user';
      return demoAttachUser(token, uid) ?? (await this.getInvite(token));
    }
  }

  async submitProfile(
    token: string,
    body: { profileComplete: boolean; verificationStatus: string },
  ): Promise<StaffOnboardingInvite> {
    try {
      return await this.post<StaffOnboardingInvite>(`/staff/onboard/${token}/submit`, {
        ...body,
        employmentStatus: body.profileComplete && body.verificationStatus === 'verified' ? 'active' : 'inactive',
      });
    } catch {
      return (
        demoSubmitProfile(token, body) ?? (await this.getInvite(token))
      );
    }
  }

  async getStatus(userId?: string): Promise<StaffOnboardingStatus> {
    try {
      return await this.get<StaffOnboardingStatus>('/staff/onboarding/status');
    } catch {
      if (userId) return demoGetStatusForUser(userId);
      return {
        required: false,
        profileComplete: true,
        verificationComplete: true,
        employmentStatus: 'active',
        canAccessApp: true,
      };
    }
  }
}

export const staffOnboardingService = new StaffOnboardingService();
