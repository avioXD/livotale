import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import { getCachedStaffProfile, updateCachedStaffProfile } from './staffProfile.mock';
import type { StaffMemberRow, StaffRoleKey } from '@/types/staffHub';
import type {
  StaffComplianceDocument,
  StaffDocumentType,
  StaffFullProfile,
} from '@/types/staffProfile';

class StaffProfileService extends BaseApiService {
  private rolePath(role: StaffRoleKey): string {
    const slugMap: Record<StaffRoleKey, string> = {
      technician: 'technicians',
      doctor: 'doctors',
      lab_partner: 'lab-partners',
      dietician: 'dieticians',
      health_coach: 'health-coaches',
      pharmacy: 'pharmacy',
      operations: 'operations',
    };
    return slugMap[role];
  }

  async getAdminProfile(role: StaffRoleKey, memberId: string, member?: StaffMemberRow): Promise<StaffFullProfile> {
    if (role === 'technician') {
      throw new Error('Use technicianProfileService for technicians');
    }
    return mockOrApi(
      () =>
        getCachedStaffProfile(
          role,
          member ?? {
            id: memberId,
            fullName: 'Staff member',
            subtitle: '',
            status: 'active',
            metrics: [],
          },
        ),
      () => this.get<StaffFullProfile>(`/admin/staff/${this.rolePath(role)}/${memberId}/profile`),
    );
  }

  async getMyProfile(role: StaffRoleKey): Promise<StaffFullProfile> {
    return mockOrApi(
      () =>
        getCachedStaffProfile(role, {
          id: `self-${role}`,
          fullName: 'My profile',
          subtitle: '',
          status: 'active',
          metrics: [],
        }),
      () => this.get<StaffFullProfile>(`/staff/${this.rolePath(role)}/profile`),
    );
  }

  async updateAdminProfile(
    role: StaffRoleKey,
    memberId: string,
    body: Record<string, unknown>,
    member?: StaffMemberRow,
  ): Promise<StaffFullProfile> {
    return mockOrApi(
      async () => {
        const current = await this.getAdminProfile(role, memberId, member);
        return updateCachedStaffProfile(role, memberId, { ...current, ...body } as Partial<StaffFullProfile>);
      },
      () =>
        this.patch<StaffFullProfile>(`/admin/staff/${this.rolePath(role)}/${memberId}/profile`, body),
    );
  }

  async updateMyProfile(role: StaffRoleKey, body: Record<string, unknown>): Promise<StaffFullProfile> {
    return mockOrApi(
      async () => {
        const current = await this.getMyProfile(role);
        return updateCachedStaffProfile(role, current.id, { ...current, ...body } as Partial<StaffFullProfile>);
      },
      () => this.patch<StaffFullProfile>(`/staff/${this.rolePath(role)}/profile`, body),
    );
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
    member?: StaffMemberRow,
  ): Promise<StaffComplianceDocument> {
    const storageUrl = await this.fileToDataUrl(file);
    return mockOrApi(
      async () => {
        const doc: StaffComplianceDocument = {
          id: `demo-doc-${Date.now()}`,
          documentType: meta.documentType,
          documentNumber: meta.documentNumber ?? null,
          fileId: null,
          storageUrl,
          issuedOn: meta.issuedOn ?? null,
          expiresOn: meta.expiresOn ?? null,
          status: 'pending',
          verifiedAt: null,
          notes: meta.notes ?? null,
          createdAt: new Date().toISOString(),
        };
        const profile = await this.getAdminProfile(role, memberId, member);
        updateCachedStaffProfile(role, memberId, { documents: [doc, ...profile.documents] });
        return doc;
      },
      () =>
        this.post<StaffComplianceDocument>(`/admin/staff/${this.rolePath(role)}/${memberId}/documents`, {
          ...meta,
          fileName: file.name,
          mimeType: file.type || 'application/pdf',
          storageUrl,
        }),
    );
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
    const storageUrl = await this.fileToDataUrl(file);
    return mockOrApi(
      async () => {
        const profile = await this.getMyProfile(role);
        const doc: StaffComplianceDocument = {
          id: `demo-doc-${Date.now()}`,
          documentType: meta.documentType,
          documentNumber: meta.documentNumber ?? null,
          fileId: null,
          storageUrl,
          issuedOn: meta.issuedOn ?? null,
          expiresOn: meta.expiresOn ?? null,
          status: 'pending',
          verifiedAt: null,
          notes: meta.notes ?? null,
          createdAt: new Date().toISOString(),
        };
        updateCachedStaffProfile(role, profile.id, { documents: [doc, ...profile.documents] });
        return doc;
      },
      () =>
        this.post<StaffComplianceDocument>(`/staff/${this.rolePath(role)}/profile/documents`, {
          ...meta,
          fileName: file.name,
          mimeType: file.type || 'application/pdf',
          storageUrl,
        }),
    );
  }

  async verifyDocument(documentId: string, status: 'verified' | 'rejected' | 'expired', notes?: string) {
    return mockOrApi(
      () => ({
        id: documentId,
        documentType: 'other' as StaffDocumentType,
        documentNumber: null,
        fileId: null,
        storageUrl: null,
        issuedOn: null,
        expiresOn: null,
        status,
        verifiedAt: new Date().toISOString(),
        notes: notes ?? null,
        createdAt: new Date().toISOString(),
      }),
      () =>
        this.post<StaffComplianceDocument>(`/admin/staff/documents/${documentId}/verify`, { status, notes }),
    );
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}

export const staffProfileService = new StaffProfileService();
