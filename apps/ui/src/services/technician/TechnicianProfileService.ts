import { storageService } from '@/services/storage/StorageService';
import { BaseApiService } from '@/services/base';
import type {
  TechnicianComplianceDocument,
  TechnicianDocumentType,
  TechnicianFullProfile,
} from '@/types/technicianProfile';

class TechnicianProfileService extends BaseApiService {
  async getMyProfile(): Promise<TechnicianFullProfile> {
    return this.get<TechnicianFullProfile>('/technician/profile')
  }

  async updateMyProfile(body: Record<string, unknown>): Promise<TechnicianFullProfile> {
    return this.patch<TechnicianFullProfile>('/technician/profile', body)
  }

  async markProfileVerified(technicianId: string): Promise<TechnicianFullProfile> {
    return this.post<TechnicianFullProfile>(`/admin/staff/technicians/${technicianId}/verify`)
  }

  private async uploadFileForTechnician(
    file: File,
    technicianId: string,
    documentType: TechnicianDocumentType,
  ): Promise<{ fileId: string; storageUrl: string }> {
    return storageService.uploadFile(file, 'technician_compliance', technicianId, documentType);
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
    const profile = await this.getMyProfile();
    const uploaded = await this.uploadFileForTechnician(file, profile.id, meta.documentType);
    return this.post<TechnicianComplianceDocument>('/technician/profile/documents', {
          documentType: meta.documentType,
          documentNumber: meta.documentNumber,
          issuedOn: meta.issuedOn,
          expiresOn: meta.expiresOn,
          notes: meta.notes,
          fileName: file.name,
          mimeType: file.type || 'application/pdf',
          fileId: uploaded.fileId || undefined,
          storageUrl: uploaded.storageUrl,
        })
  }

  async getAdminProfile(technicianId: string): Promise<TechnicianFullProfile> {
    return this.get<TechnicianFullProfile>(`/admin/staff/technicians/${technicianId}/profile`)
  }

  async updateAdminProfile(technicianId: string, body: Record<string, unknown>): Promise<TechnicianFullProfile> {
    return this.patch<TechnicianFullProfile>(`/admin/staff/technicians/${technicianId}/profile`, body)
  }

  async setAdminPincodes(technicianId: string, pincodes: string[]): Promise<TechnicianFullProfile> {
    return this.put<TechnicianFullProfile>(`/admin/staff/technicians/${technicianId}/pincodes`, { pincodes })
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
    const uploaded = await this.uploadFileForTechnician(file, technicianId, meta.documentType);
    return this.post<TechnicianComplianceDocument>(`/admin/staff/technicians/${technicianId}/documents`, {
          documentType: meta.documentType,
          documentNumber: meta.documentNumber,
          issuedOn: meta.issuedOn,
          expiresOn: meta.expiresOn,
          notes: meta.notes,
          fileName: file.name,
          mimeType: file.type || 'application/pdf',
          fileId: uploaded.fileId || undefined,
          storageUrl: uploaded.storageUrl,
        })
  }

  async verifyDocument(documentId: string, status: 'verified' | 'rejected' | 'expired', notes?: string) {
    return this.post<TechnicianComplianceDocument>(
          `/admin/staff/technicians/documents/${documentId}/verify`,
          { status, notes },
        )
  }
}

export const technicianProfileService = new TechnicianProfileService();
