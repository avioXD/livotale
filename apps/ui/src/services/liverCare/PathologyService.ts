import { storageService } from '@/services/storage/StorageService';
import { BaseApiService } from '@/services/base';
import type { LabReportQueueRow, LabReportUpload, UploadLabReportFromEmailInput } from '@/types/labReport';
import type { CollectionProofPhotoType, SampleDispatch } from '@/types/sampleDispatch';
import type { PartnerLab } from '@/types/partnerLab';
import type { AIExtractionJob } from '@/types/aiExtraction';
import type { SchedulePathologyInput, LiverCareOrder } from '@/types/serviceOrder';
import type { LabReportQueueFilters } from './pathology.queue';

export type { LabReportQueueFilters };

export interface UploadLabReportResult {
  report: LabReportUpload;
  extractionJob: AIExtractionJob;
}

class PathologyService extends BaseApiService {
  async listPartnerLabsForTechnician(): Promise<PartnerLab[]> {
    return this.get<PartnerLab[]>('/technician/partner-labs');
  }

  async getReport(orderId: string): Promise<LabReportUpload | null> {
    return this.get<LabReportUpload>(`/admin/orders/${orderId}/pathology`);
  }

  async getSampleDispatch(orderId: string): Promise<SampleDispatch | null> {
    return this.get<SampleDispatch>(`/admin/orders/${orderId}/sample-dispatch`);
  }

  async listSampleDispatchQueue(): Promise<SampleDispatch[]> {
    return this.get<SampleDispatch[]>('/admin/pathology/sample-dispatch-queue');
  }

  async listLabReportQueue(filters?: LabReportQueueFilters): Promise<LabReportQueueRow[]> {
    return this.get<LabReportQueueRow[]>('/admin/pathology/lab-report-queue', {
      params: {
        search: filters?.search,
        dispatchStatus: filters?.dispatchStatus,
        labId: filters?.labId,
        extractionStatus: filters?.extractionStatus,
      },
    });
  }

  async getLabReportQueueRow(orderId: string): Promise<LabReportQueueRow | null> {
    return this.get<LabReportQueueRow>(`/admin/pathology/lab-report-queue/${orderId}`);
  }

  async assignLab(orderId: string, partnerLabId: string): Promise<SampleDispatch> {
    return this.post<SampleDispatch>(`/admin/orders/${orderId}/assign-lab`, { partnerLabId });
  }

  async createLabPartnerOrder(orderId: string): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>(`/admin/orders/${orderId}/lab-partner-order`, {});
  }

  async updateExternalAppointment(orderId: string, externalAppointmentId: string): Promise<LiverCareOrder> {
    return this.patch<LiverCareOrder>(`/admin/orders/${orderId}/pathology-external-appointment`, {
      externalAppointmentId,
    });
  }

  async schedulePathology(orderId: string, input: SchedulePathologyInput): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>(`/admin/orders/${orderId}/schedule-pathology`, input);
  }

  async confirmLabPartnerVisit(
    orderId: string,
    outcome: 'visited' | 'no_show',
    notes?: string,
  ): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>(`/admin/orders/${orderId}/lab-partner-visit`, { outcome, notes });
  }

  async markLabPartnerCollected(orderId: string): Promise<SampleDispatch> {
    return this.post<SampleDispatch>(`/admin/orders/${orderId}/lab-partner-collected`, {});
  }

  async uploadCollectionProof(
    orderId: string,
    input: {
      file: File;
      photoType: CollectionProofPhotoType;
      orderLabelVerified?: boolean;
    },
  ): Promise<SampleDispatch> {
    const uploaded = await storageService.uploadFile(
      input.file,
      'collection_proof',
      orderId,
      input.photoType,
    );
    return this.post<SampleDispatch>(`/technician/orders/${orderId}/sample-dispatch/proof`, {
      fileName: input.file.name,
      photoType: input.photoType,
      orderLabelVerified: input.orderLabelVerified,
      fileId: uploaded.fileId,
      storageUrl: uploaded.storageUrl,
    });
  }

  async markSampleCollected(orderId: string, collectedBy: string): Promise<SampleDispatch> {
    return this.post<SampleDispatch>(`/technician/orders/${orderId}/sample-dispatch/collected`, { collectedBy });
  }

  async technicianSubmitSampleToLab(
    orderId: string,
    partnerLabId: string,
    dispatchedBy: string,
    courierRef?: string,
  ): Promise<SampleDispatch> {
    return this.post<SampleDispatch>(`/technician/orders/${orderId}/sample-dispatch/submit`, {
      partnerLabId,
      dispatchedBy,
      courierRef,
    });
  }

  async dispatchSample(orderId: string, dispatchedBy: string, courierRef?: string): Promise<SampleDispatch> {
    return this.post<SampleDispatch>(`/admin/orders/${orderId}/sample-dispatch`, { dispatchedBy, courierRef });
  }

  async markReceivedAtLab(orderId: string): Promise<SampleDispatch> {
    return this.post<SampleDispatch>(`/admin/orders/${orderId}/sample-dispatch/received`);
  }

  async markAwaitingReport(orderId: string): Promise<SampleDispatch> {
    return this.post<SampleDispatch>(`/admin/orders/${orderId}/sample-dispatch/awaiting-report`);
  }

  async uploadReportFromEmail(orderId: string, input: UploadLabReportFromEmailInput): Promise<UploadLabReportResult> {
    const form = new FormData();
    form.append('file', input.file);
    if (input.emailFrom) form.append('emailFrom', input.emailFrom);
    if (input.emailSubject) form.append('emailSubject', input.emailSubject);
    if (input.emailReceivedAt) form.append('emailReceivedAt', input.emailReceivedAt);
    const report = await this.post<LabReportUpload>(`/admin/orders/${orderId}/lab-report`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const extractionJob = await this.post<AIExtractionJob>(`/admin/orders/${orderId}/ai-extract`);
    return { report, extractionJob };
  }

  /** @deprecated Use uploadReportFromEmail with PDF file from lab email */
  async uploadReport(orderId: string, fileName: string): Promise<LabReportUpload> {
    const blob = new Blob(['mock lab pdf'], { type: 'application/pdf' });
    const file = new File([blob], fileName, { type: 'application/pdf' });
    const { report } = await this.uploadReportFromEmail(orderId, { file });
    return report;
  }

  async listReportsPendingExtraction(): Promise<LabReportUpload[]> {
    return this.get<LabReportUpload[]>('/admin/pathology/pending-extraction');
  }
}

export const pathologyService = new PathologyService();
