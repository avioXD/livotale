import { BaseApiService } from '@/services/base';
import { isApiUnavailableError } from '@/data/labSampleDemoData';
import { TECHNICIAN_PROFILE_DEMO } from '@/data/technicianProfileDemoData';
import type {
  TechnicianComplianceDocument,
  TechnicianDocumentType,
  TechnicianFullProfile,
} from '@/types/technicianProfile';

class TechnicianProfileService extends BaseApiService {
  async getMyProfile(): Promise<TechnicianFullProfile> {
    try {
      return await this.get<TechnicianFullProfile>('/technician/profile');
    } catch {
      return { ...TECHNICIAN_PROFILE_DEMO };
    }
  }

  async updateMyProfile(body: Record<string, unknown>): Promise<TechnicianFullProfile> {
    try {
      return await this.patch<TechnicianFullProfile>('/technician/profile', body);
    } catch (err) {
      if (isApiUnavailableError(err)) {
        return {
          ...TECHNICIAN_PROFILE_DEMO,
          employee: { ...TECHNICIAN_PROFILE_DEMO.employee!, ...body } as TechnicianFullProfile['employee'],
        };
      }
      throw err;
    }
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
    try {
      return await this.post<TechnicianComplianceDocument>('/technician/profile/documents', {
        documentType: meta.documentType,
        documentNumber: meta.documentNumber,
        issuedOn: meta.issuedOn,
        expiresOn: meta.expiresOn,
        notes: meta.notes,
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        storageUrl,
      });
    } catch (err) {
      if (isApiUnavailableError(err)) {
        return {
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
      }
      throw err;
    }
  }

  async getAdminProfile(technicianId: string): Promise<TechnicianFullProfile> {
    try {
      return await this.get<TechnicianFullProfile>(`/admin/staff/technicians/${technicianId}/profile`);
    } catch {
      return { ...TECHNICIAN_PROFILE_DEMO, id: technicianId };
    }
  }

  async updateAdminProfile(technicianId: string, body: Record<string, unknown>): Promise<TechnicianFullProfile> {
    try {
      return await this.patch<TechnicianFullProfile>(`/admin/staff/technicians/${technicianId}/profile`, body);
    } catch (err) {
      if (isApiUnavailableError(err)) {
        return { ...TECHNICIAN_PROFILE_DEMO, id: technicianId, ...body } as TechnicianFullProfile;
      }
      throw err;
    }
  }

  async setAdminPincodes(technicianId: string, pincodes: string[]): Promise<TechnicianFullProfile> {
    try {
      return await this.put<TechnicianFullProfile>(`/admin/staff/technicians/${technicianId}/pincodes`, { pincodes });
    } catch (err) {
      if (isApiUnavailableError(err)) {
        return {
          ...TECHNICIAN_PROFILE_DEMO,
          id: technicianId,
          servicePincodes: pincodes.map((pincode) => ({ pincode, isActive: true })),
        };
      }
      throw err;
    }
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
    try {
      return await this.post<TechnicianComplianceDocument>(
        `/admin/staff/technicians/${technicianId}/documents`,
        {
          documentType: meta.documentType,
          documentNumber: meta.documentNumber,
          issuedOn: meta.issuedOn,
          expiresOn: meta.expiresOn,
          notes: meta.notes,
          fileName: file.name,
          mimeType: file.type || 'application/pdf',
          storageUrl,
        },
      );
    } catch (err) {
      if (isApiUnavailableError(err)) {
        return {
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
      }
      throw err;
    }
  }

  async verifyDocument(documentId: string, status: 'verified' | 'rejected' | 'expired', notes?: string) {
    try {
      return await this.post<TechnicianComplianceDocument>(
        `/admin/staff/technicians/documents/${documentId}/verify`,
        { status, notes },
      );
    } catch (err) {
      if (isApiUnavailableError(err)) {
        return {
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
        };
      }
      throw err;
    }
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
