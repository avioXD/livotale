import { storageService } from '@/services/storage/StorageService';
import { BaseApiService } from '@/services/base';
import { STAFF_ROLE_SLUGS } from '@/app/pages/admin/staff/staffHubConfig';
import type { StaffMemberRow, StaffRoleKey } from '@/types/staffHub';
import type {
  StaffComplianceDocument,
  StaffDocumentType,
  StaffFullProfile,
} from '@/types/staffProfile';

class StaffProfileService extends BaseApiService {
  private rolePath(role: StaffRoleKey): string {
    return STAFF_ROLE_SLUGS[role];
  }

  async getAdminProfile(role: StaffRoleKey, memberId: string, _member?: StaffMemberRow): Promise<StaffFullProfile> {
    if (role === 'technician') {
      throw new Error('Use technicianProfileService for technicians');
    }
    return this.get<StaffFullProfile>(`/admin/staff/${this.rolePath(role)}/${memberId}/profile`)
  }

  async getMyProfile(role: StaffRoleKey): Promise<StaffFullProfile> {
    return this.get<StaffFullProfile>(`/staff/${this.rolePath(role)}/profile`)
  }

  async updateAdminProfile(
    role: StaffRoleKey,
    memberId: string,
    body: Record<string, unknown>,
    _member?: StaffMemberRow,
  ): Promise<StaffFullProfile> {
    return this.patch<StaffFullProfile>(`/admin/staff/${this.rolePath(role)}/${memberId}/profile`, body);
  }

  async updateMyProfile(role: StaffRoleKey, body: Record<string, unknown>): Promise<StaffFullProfile> {
    return this.patch<StaffFullProfile>(`/staff/${this.rolePath(role)}/profile`, body)
  }

  async markProfileVerified(role: StaffRoleKey, memberId: string): Promise<StaffFullProfile> {
    return this.post<StaffFullProfile>(`/admin/staff/${this.rolePath(role)}/${memberId}/verify`)
  }

  private async uploadFileForProfile(
    file: File,
    entityId: string,
    documentType: StaffDocumentType,
  ): Promise<{ fileId: string; storageUrl: string }> {
    return storageService.uploadFile(file, 'staff_compliance', entityId, documentType);
  }

  async uploadAdminDocument(
    role: StaffRoleKey,
    memberId: string,
    file: File,
    meta: {
      documentType: StaffDocumentType;
      documentNumber?: string;
      issuedOn?: string;
      expiresOn?: string;
      notes?: string;
    },
    _member?: StaffMemberRow,
  ): Promise<StaffComplianceDocument> {
    const uploaded = await this.uploadFileForProfile(file, memberId, meta.documentType);
    return this.post<StaffComplianceDocument>(`/admin/staff/${this.rolePath(role)}/${memberId}/documents`, {
          ...meta,
          fileName: file.name,
          mimeType: file.type || 'application/pdf',
          fileId: uploaded.fileId || undefined,
          storageUrl: uploaded.storageUrl,
        })
  }

  async uploadMyDocument(
    role: StaffRoleKey,
    file: File,
    meta: {
      documentType: StaffDocumentType;
      documentNumber?: string;
      issuedOn?: string;
      expiresOn?: string;
      notes?: string;
    },
  ): Promise<StaffComplianceDocument> {
    const currentProfile = await this.getMyProfile(role);
    const uploaded = await this.uploadFileForProfile(file, currentProfile.id, meta.documentType);
    return this.post<StaffComplianceDocument>(`/staff/${this.rolePath(role)}/profile/documents`, {
          ...meta,
          fileName: file.name,
          mimeType: file.type || 'application/pdf',
          fileId: uploaded.fileId || undefined,
          storageUrl: uploaded.storageUrl,
        })
  }

  async verifyDocument(documentId: string, status: 'verified' | 'rejected' | 'expired', notes?: string) {
    return this.post<StaffComplianceDocument>(`/admin/staff/documents/${documentId}/verify`, { status, notes })
  }
}

export const staffProfileService = new StaffProfileService();
