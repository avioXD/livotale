import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import { TECHNICIAN_PROFILE_DEMO } from './technicianProfile.mock';
import type {
  TechnicianComplianceDocument,
  TechnicianDocumentType,
  TechnicianFullProfile,
} from '@/types/technicianProfile';

let mockTechnicianProfile: TechnicianFullProfile = { ...TECHNICIAN_PROFILE_DEMO };

class TechnicianProfileService extends BaseApiService {
  async getMyProfile(): Promise<TechnicianFullProfile> {
    return mockOrApi(
      () => ({ ...mockTechnicianProfile }),
      () => this.get<TechnicianFullProfile>('/technician/profile'),
    );
  }

  async updateMyProfile(body: Record<string, unknown>): Promise<TechnicianFullProfile> {
    return mockOrApi(
      () => {
        mockTechnicianProfile = {
          ...mockTechnicianProfile,
          employee: { ...mockTechnicianProfile.employee!, ...body } as TechnicianFullProfile['employee'],
        };
        return { ...mockTechnicianProfile };
      },
      () => this.patch<TechnicianFullProfile>('/technician/profile', body),
    );
  }

  async uploadMyDocument(
    file: File,
    meta: {
      documentType: TechnicianDocumentType;
      documentNumber?: string;
      issuedOn?: string;
      expiresOn?: string;
      notes?: string;
    },
  ): Promise<TechnicianComplianceDocument> {
    const storageUrl = await this.fileToDataUrl(file);
    return mockOrApi(
      () => ({
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
      }),
      () =>
        this.post<TechnicianComplianceDocument>('/technician/profile/documents', {
          documentType: meta.documentType,
          documentNumber: meta.documentNumber,
          issuedOn: meta.issuedOn,
          expiresOn: meta.expiresOn,
          notes: meta.notes,
          fileName: file.name,
          mimeType: file.type || 'application/pdf',
          storageUrl,
        }),
    );
  }

  async getAdminProfile(technicianId: string): Promise<TechnicianFullProfile> {
    return mockOrApi(
      () => ({ ...TECHNICIAN_PROFILE_DEMO, id: technicianId }),
      () => this.get<TechnicianFullProfile>(`/admin/staff/technicians/${technicianId}/profile`),
    );
  }

  async updateAdminProfile(technicianId: string, body: Record<string, unknown>): Promise<TechnicianFullProfile> {
    return mockOrApi(
      () => ({ ...TECHNICIAN_PROFILE_DEMO, id: technicianId, ...body } as TechnicianFullProfile),
      () => this.patch<TechnicianFullProfile>(`/admin/staff/technicians/${technicianId}/profile`, body),
    );
  }

  async setAdminPincodes(technicianId: string, pincodes: string[]): Promise<TechnicianFullProfile> {
    return mockOrApi(
      () => ({
        ...TECHNICIAN_PROFILE_DEMO,
        id: technicianId,
        servicePincodes: pincodes.map((pincode) => ({ pincode, isActive: true })),
      }),
      () => this.put<TechnicianFullProfile>(`/admin/staff/technicians/${technicianId}/pincodes`, { pincodes }),
    );
  }

  async uploadAdminDocument(
    technicianId: string,
    file: File,
    meta: {
      documentType: TechnicianDocumentType;
      documentNumber?: string;
      issuedOn?: string;
      expiresOn?: string;
      notes?: string;
    },
  ): Promise<TechnicianComplianceDocument> {
    const storageUrl = await this.fileToDataUrl(file);
    return mockOrApi(
      () => ({
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
      }),
      () =>
        this.post<TechnicianComplianceDocument>(`/admin/staff/technicians/${technicianId}/documents`, {
          documentType: meta.documentType,
          documentNumber: meta.documentNumber,
          issuedOn: meta.issuedOn,
          expiresOn: meta.expiresOn,
          notes: meta.notes,
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
        documentType: 'other',
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
        this.post<TechnicianComplianceDocument>(
          `/admin/staff/technicians/documents/${documentId}/verify`,
          { status, notes },
        ),
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

export const technicianProfileService = new TechnicianProfileService();
