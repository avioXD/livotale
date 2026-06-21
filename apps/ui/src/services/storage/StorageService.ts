import { BaseApiService } from '@/services/base';

export interface PresignUploadResult {
  fileId: string;
  uploadUrl: string;
  storageUrl: string;
  key: string;
  mimeType: string;
  fileName: string;
}

export interface ConfirmUploadResult {
  fileId: string;
  storageUrl: string;
  confirmed: boolean;
}

class StorageService extends BaseApiService {
  async presignUpload(params: {
    fileName: string;
    mimeType: string;
    entityType: string;
    entityId: string;
    subfolder?: string;
  }): Promise<PresignUploadResult> {
    return this.post('/storage/presign', params);
  }

  async confirmUpload(fileId: string): Promise<ConfirmUploadResult> {
    return this.post(`/storage/${fileId}/confirm`);
  }

  /** Upload file via presigned URL flow; returns storage URL and file id. */
  async uploadFile(
    file: File,
    entityType: string,
    entityId: string,
    subfolder?: string,
  ): Promise<{ fileId: string; storageUrl: string }> {
    let presign: PresignUploadResult;
    try {
      presign = await this.presignUpload({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        entityType,
        entityId,
        subfolder,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not start upload';
      throw new Error(message === 'Forbidden' ? 'You do not have permission to upload this file' : message);
    }

    const putResponse = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': presign.mimeType },
      body: file,
    });
    if (!putResponse.ok) {
      throw new Error(
        putResponse.status === 403
          ? 'Storage rejected the upload. Try submitting again or contact support.'
          : 'Upload to storage failed',
      );
    }

    try {
      const confirmed = await this.confirmUpload(presign.fileId);
      return { fileId: confirmed.fileId, storageUrl: confirmed.storageUrl };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload could not be verified';
      throw new Error(message);
    }
  }
}

export const storageService = new StorageService();
