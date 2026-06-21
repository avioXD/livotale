import { BaseApiService } from '@/services/base';
import { STAFF_ROLE_SLUGS } from '@/app/pages/admin/staff/staffHubConfig';
import type { StaffArchiveEligibility, StaffArchiveResult, StaffMemberRow, StaffRoleDashboard, StaffRoleKey, StaffUnarchiveResult } from '@/types/staffHub';

class StaffDirectoryService extends BaseApiService {
  async listUsers(role: StaffRoleKey): Promise<StaffMemberRow[]> {
    return this.get<StaffMemberRow[]>(`/admin/staff/${STAFF_ROLE_SLUGS[role]}/users`)
  }

  async createMember(
    role: StaffRoleKey,
    input: { id?: string; fullName: string; mobile: string; email?: string | null; status?: string },
  ): Promise<StaffMemberRow> {
    return this.post<StaffMemberRow>(`/admin/staff/${STAFF_ROLE_SLUGS[role]}/users`, input)
  }

  async updateMember(role: StaffRoleKey, memberId: string, patch: Partial<StaffMemberRow>): Promise<StaffMemberRow> {
    return this.patch<StaffMemberRow>(`/admin/staff/${STAFF_ROLE_SLUGS[role]}/users/${memberId}`, patch)
  }

  async upsertMember(role: StaffRoleKey, member: StaffMemberRow): Promise<StaffMemberRow> {
    return this.put<StaffMemberRow>(`/admin/staff/${STAFF_ROLE_SLUGS[role]}/users/${member.id}`, member)
  }

  async getDashboard(role: StaffRoleKey): Promise<StaffRoleDashboard | null> {
    return this.get<StaffRoleDashboard>(`/admin/staff/${STAFF_ROLE_SLUGS[role]}/org/dashboard`)
  }

  async checkArchiveEligibility(role: StaffRoleKey, memberId: string): Promise<StaffArchiveEligibility> {
    return this.get<StaffArchiveEligibility>(
      `/admin/staff/${STAFF_ROLE_SLUGS[role]}/users/${memberId}/archive-check`,
    );
  }

  async archiveMember(role: StaffRoleKey, memberId: string): Promise<StaffArchiveResult> {
    return this.post<StaffArchiveResult>(
      `/admin/staff/${STAFF_ROLE_SLUGS[role]}/users/${memberId}/archive`,
      {},
    );
  }

  async unarchiveMember(role: StaffRoleKey, memberId: string): Promise<StaffUnarchiveResult> {
    return this.post<StaffUnarchiveResult>(
      `/admin/staff/${STAFF_ROLE_SLUGS[role]}/users/${memberId}/unarchive`,
      {},
    );
  }
}

export const staffDirectoryService = new StaffDirectoryService();
