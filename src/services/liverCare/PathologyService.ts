import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import { notifyOps, notifyTechnician } from '@/services/notifications/InboxNotificationService';
import type { LabReportUpload, UploadLabReportFromEmailInput } from '@/types/labReport';
import type { SampleDispatch } from '@/types/sampleDispatch';
import type { AIExtractionJob } from '@/types/aiExtraction';
import { MOCK_LAB_REPORTS, MOCK_PARTNER_LABS, MOCK_SAMPLE_DISPATCHES } from './pathology.mock';
import { MOCK_LIVER_ORDERS } from './liverCare.mock';
import { appendOrderTimeline } from './orderTimeline';
import { liverCareOrderService } from './OrderService';
import { aiExtractionOrderService } from './AIExtractionOrderService';

function ensureDispatch(orderId: string): SampleDispatch {
  const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId)!;
  if (!MOCK_SAMPLE_DISPATCHES[orderId]) {
    MOCK_SAMPLE_DISPATCHES[orderId] = {
      id: `sd-${orderId}`,
      orderId,
      partnerLabId: order.partnerLabId ?? '',
      partnerLabName: order.partnerLabName ?? 'Partner lab',
      status: 'pending_dispatch',
      updatedAt: new Date().toISOString(),
    };
  }
  return MOCK_SAMPLE_DISPATCHES[orderId];
}

export interface UploadLabReportResult {
  report: LabReportUpload;
  extractionJob: AIExtractionJob;
}

class PathologyService extends BaseApiService {
  async getReport(orderId: string): Promise<LabReportUpload | null> {
    return mockOrApi(
      () => MOCK_LAB_REPORTS[orderId] ?? null,
      () => this.get<LabReportUpload>(`/admin/orders/${orderId}/pathology`),
    );
  }

  async getSampleDispatch(orderId: string): Promise<SampleDispatch | null> {
    return mockOrApi(
      () => MOCK_SAMPLE_DISPATCHES[orderId] ?? null,
      () => this.get<SampleDispatch>(`/admin/orders/${orderId}/sample-dispatch`),
    );
  }

  async listSampleDispatchQueue(): Promise<SampleDispatch[]> {
    return mockOrApi(
      () =>
        Object.values(MOCK_SAMPLE_DISPATCHES)
          .filter((d) => d.status !== 'report_uploaded' && d.status !== 'not_required' && d.status !== 'cancelled')
          .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()),
      () => this.get<SampleDispatch[]>('/admin/pathology/sample-dispatch-queue'),
    );
  }

  async assignLab(orderId: string, partnerLabId: string): Promise<void> {
    return mockOrApi(
      async () => {
        const lab = MOCK_PARTNER_LABS.find((l) => l.id === partnerLabId);
        if (!lab) throw new Error('Partner lab not found');
        const idx = MOCK_LIVER_ORDERS.findIndex((o) => o.id === orderId);
        if (idx < 0) throw new Error('Order not found');
        MOCK_LIVER_ORDERS[idx] = {
          ...MOCK_LIVER_ORDERS[idx],
          partnerLabId: lab.id,
          partnerLabName: lab.name,
          updatedAt: new Date().toISOString(),
        };
        const dispatch = ensureDispatch(orderId);
        dispatch.partnerLabId = lab.id;
        dispatch.partnerLabName = lab.name;
        dispatch.status = 'pending_dispatch';
        dispatch.updatedAt = new Date().toISOString();
        MOCK_SAMPLE_DISPATCHES[orderId] = dispatch;

        try {
          await liverCareOrderService.transition(orderId, 'assign_lab');
        } catch {
          MOCK_LIVER_ORDERS[idx].orderStatus = 'pathology_pending';
        }
        appendOrderTimeline(orderId, 'lab_assigned', {
          performedBy: 'operations',
          detail: `${lab.name} · ${lab.city}`,
          metadata: { partnerLabId: lab.id, partnerLabName: lab.name },
        });
        notifyTechnician('Partner lab assigned', `Send blood sample to ${lab.name} for order ${MOCK_LIVER_ORDERS[idx].orderNumber}.`, 'lab_assigned', orderId);
        notifyOps('Lab assigned', `${lab.name} assigned — sample dispatch pending.`, 'lab_assigned', orderId);
      },
      () => this.post(`/admin/orders/${orderId}/assign-lab`, { partnerLabId }),
    );
  }

  async dispatchSample(orderId: string, dispatchedBy: string, courierRef?: string): Promise<SampleDispatch> {
    return mockOrApi(
      () => {
        const dispatch = ensureDispatch(orderId);
        if (!dispatch.partnerLabId) throw new Error('Assign partner lab first');
        dispatch.status = 'dispatched';
        dispatch.dispatchedBy = dispatchedBy;
        dispatch.dispatchedAt = new Date().toISOString();
        dispatch.courierRef = courierRef ?? null;
        dispatch.updatedAt = dispatch.dispatchedAt;
        MOCK_SAMPLE_DISPATCHES[orderId] = dispatch;
        appendOrderTimeline(orderId, 'sample_dispatched', {
          performedBy: dispatchedBy,
          detail: `Courier to ${dispatch.partnerLabName}${courierRef ? ` · Ref ${courierRef}` : ''}`,
          metadata: courierRef ? { courierRef } : undefined,
        });
        notifyOps('Sample submitted to lab', `Blood sample sent to ${dispatch.partnerLabName}. Await PDF report via email.`, 'sample_dispatched', orderId);
        return dispatch;
      },
      () => this.post<SampleDispatch>(`/admin/orders/${orderId}/sample-dispatch`, { dispatchedBy, courierRef }),
    );
  }

  async markReceivedAtLab(orderId: string): Promise<SampleDispatch> {
    return mockOrApi(
      () => {
        const dispatch = MOCK_SAMPLE_DISPATCHES[orderId];
        if (!dispatch) throw new Error('No sample dispatch record');
        dispatch.status = 'received_at_lab';
        dispatch.receivedAtLabAt = new Date().toISOString();
        dispatch.updatedAt = dispatch.receivedAtLabAt;
        MOCK_SAMPLE_DISPATCHES[orderId] = dispatch;
        appendOrderTimeline(orderId, 'sample_received_at_lab', {
          performedBy: 'system',
          detail: `${dispatch.partnerLabName} confirmed receipt`,
        });
        return dispatch;
      },
      () => this.post<SampleDispatch>(`/admin/orders/${orderId}/sample-dispatch/received`),
    );
  }

  async markAwaitingReport(orderId: string): Promise<SampleDispatch> {
    return mockOrApi(
      () => {
        const dispatch = MOCK_SAMPLE_DISPATCHES[orderId];
        if (!dispatch) throw new Error('No sample dispatch record');
        dispatch.status = 'awaiting_report';
        dispatch.awaitingReportSince = new Date().toISOString();
        dispatch.updatedAt = dispatch.awaitingReportSince;
        MOCK_SAMPLE_DISPATCHES[orderId] = dispatch;
        const lab = MOCK_PARTNER_LABS.find((l) => l.id === dispatch.partnerLabId);
        appendOrderTimeline(orderId, 'awaiting_lab_report', {
          performedBy: 'operations',
          detail: `Watch inbox: ${lab?.email ?? 'partner lab email'}`,
          metadata: lab?.email ? { labEmail: lab.email } : undefined,
        });
        notifyOps(
          'Awaiting lab report email',
          `Check inbox for PDF from ${lab?.name ?? dispatch.partnerLabName} (${lab?.email ?? 'lab email'}).`,
          'awaiting_lab_report',
          orderId,
        );
        return dispatch;
      },
      () => this.post<SampleDispatch>(`/admin/orders/${orderId}/sample-dispatch/awaiting-report`),
    );
  }

  /**
   * Operations uploads the PDF attachment from the partner lab email.
   * Automatically queues dummy AI extraction and saves extracted fields to mock DB.
   */
  async uploadReportFromEmail(orderId: string, input: UploadLabReportFromEmailInput): Promise<UploadLabReportResult> {
    return mockOrApi(
      async () => {
        const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId);
        if (!order) throw new Error('Order not found');
        if (!order.partnerLabId) throw new Error('Assign a partner lab first');

        const dispatch = MOCK_SAMPLE_DISPATCHES[orderId];
        if (!dispatch || !['awaiting_report', 'received_at_lab', 'dispatched'].includes(dispatch.status)) {
          throw new Error('Mark sample as awaiting report before uploading lab PDF');
        }

        if (!input.file.name.toLowerCase().endsWith('.pdf')) {
          throw new Error('Only PDF files from lab email are accepted');
        }

        const lab = MOCK_PARTNER_LABS.find((l) => l.id === order.partnerLabId)!;
        const fileUrl = URL.createObjectURL(input.file);

        const report: LabReportUpload = {
          id: `lr-${orderId}-${Date.now()}`,
          orderId,
          patientId: order.patientId,
          partnerLabId: lab.id,
          partnerLabName: lab.name,
          fileName: input.file.name,
          fileUrl,
          fileId: `file-lr-${orderId}`,
          uploadedBy: input.uploadedBy ?? 'operations',
          uploadedAt: new Date().toISOString(),
          extractionStatus: 'not_started',
          finalStatus: 'pending',
          sourceType: 'partner_lab_email',
          emailFrom: input.emailFrom ?? lab.email,
          emailSubject: input.emailSubject ?? `Pathology report — ${order.patientName}`,
          emailReceivedAt: input.emailReceivedAt ?? new Date().toISOString(),
          fileSizeBytes: input.file.size,
        };
        MOCK_LAB_REPORTS[orderId] = report;

        if (dispatch) {
          dispatch.status = 'report_uploaded';
          dispatch.updatedAt = new Date().toISOString();
        }

        try {
          await liverCareOrderService.transition(orderId, 'upload_lab_report');
        } catch {
          const idx = MOCK_LIVER_ORDERS.findIndex((o) => o.id === orderId);
          MOCK_LIVER_ORDERS[idx] = {
            ...MOCK_LIVER_ORDERS[idx],
            orderStatus: 'lab_report_uploaded',
            updatedAt: new Date().toISOString(),
          };
        }

        appendOrderTimeline(orderId, 'lab_report_uploaded', {
          performedBy: input.uploadedBy ?? 'operations',
          detail: `${input.file.name} from ${input.emailFrom ?? lab.email} · AI extraction queued`,
          metadata: {
            fileName: input.file.name,
            emailFrom: input.emailFrom ?? lab.email,
            fileSizeBytes: String(input.file.size),
          },
        });

        const extractionJob = await aiExtractionOrderService.triggerExtraction(orderId);

        notifyOps(
          'AI extraction ready for review',
          `${extractionJob.fields.length} pathology fields extracted — verify then generate letterhead report.`,
          'ai_extraction_completed',
          orderId,
        );

        return { report, extractionJob };
      },
      async () => {
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
      },
    );
  }

  /** @deprecated Use uploadReportFromEmail with PDF file from lab email */
  async uploadReport(orderId: string, fileName: string): Promise<LabReportUpload> {
    const blob = new Blob(['mock lab pdf'], { type: 'application/pdf' });
    const file = new File([blob], fileName, { type: 'application/pdf' });
    const { report } = await this.uploadReportFromEmail(orderId, { file });
    return report;
  }

  async listReportsPendingExtraction(): Promise<LabReportUpload[]> {
    return mockOrApi(
      () =>
        Object.values(MOCK_LAB_REPORTS).filter(
          (r) =>
            r.extractionStatus === 'not_started' ||
            r.extractionStatus === 'extracted' ||
            r.extractionStatus === 'review_pending',
        ),
      () => this.get<LabReportUpload[]>('/admin/pathology/pending-extraction'),
    );
  }
}

export const pathologyService = new PathologyService();
