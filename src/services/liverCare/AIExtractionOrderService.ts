import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import { getAIExtractionService } from '@/services/external';
import type { AIExtractionJob, ExtractedField } from '@/types/aiExtraction';
import { MOCK_AI_JOBS, MOCK_LAB_REPORTS } from './pathology.mock';
import { appendOrderTimeline } from './orderTimeline';
import { notifyOps } from '@/services/notifications/InboxNotificationService';
import { liverCareOrderService } from './OrderService';

class AIExtractionOrderService extends BaseApiService {
  async getJobForOrder(orderId: string): Promise<AIExtractionJob | null> {
    return mockOrApi(
      () => MOCK_AI_JOBS[orderId] ?? null,
      () => this.get<AIExtractionJob>(`/admin/orders/${orderId}/ai-extraction`),
    );
  }

  async listPendingReview(): Promise<AIExtractionJob[]> {
    return mockOrApi(
      () =>
        Object.values(MOCK_AI_JOBS).filter((j) =>
          ['extracted', 'review_pending', 'processing', 'queued'].includes(j.status),
        ),
      () => this.get<AIExtractionJob[]>('/admin/ai-extraction/pending'),
    );
  }

  async triggerExtraction(orderId: string): Promise<AIExtractionJob> {
    return mockOrApi(
      async () => {
        const report = MOCK_LAB_REPORTS[orderId];
        if (!report) throw new Error('Upload pathology report first');

        const ai = getAIExtractionService();
        let job = await ai.queueExtraction(orderId, 'pathology', report.fileId);
        report.extractionStatus = 'queued';
        job = await ai.processJob(job.id);
        job.status = 'review_pending';
        MOCK_AI_JOBS[orderId] = job;
        report.extractionStatus = 'review_pending';

        try {
          await liverCareOrderService.transition(orderId, 'trigger_ai');
        } catch {
          // may already be past
        }
        appendOrderTimeline(orderId, 'ai_extraction', {
          performedBy: 'system',
          detail: `${job.fields.length} pathology fields extracted and saved for review`,
          metadata: { fieldCount: String(job.fields.length), jobId: job.id },
        });
        notifyOps('Pathology data extracted', `Review ${job.fields.length} fields before generating letterhead report.`, 'ai_extraction_completed', orderId);
        return job;
      },
      () => this.post<AIExtractionJob>(`/admin/orders/${orderId}/ai-extract`),
    );
  }

  async updateFields(orderId: string, fields: ExtractedField[]): Promise<AIExtractionJob> {
    return mockOrApi(
      () => {
        const job = MOCK_AI_JOBS[orderId];
        if (!job) throw new Error('No extraction job for this order');
        job.fields = fields;
        job.updatedAt = new Date().toISOString();
        MOCK_AI_JOBS[orderId] = job;
        return job;
      },
      () => this.patch<AIExtractionJob>(`/admin/orders/${orderId}/ai-extraction/fields`, { fields }),
    );
  }

  async requestReupload(orderId: string): Promise<AIExtractionJob> {
    return mockOrApi(
      () => {
        const job = MOCK_AI_JOBS[orderId];
        if (!job) throw new Error('No extraction job for this order');
        job.status = 'reupload_required';
        job.updatedAt = new Date().toISOString();
        MOCK_AI_JOBS[orderId] = job;
        const report = MOCK_LAB_REPORTS[orderId];
        if (report) {
          report.extractionStatus = 'reupload_required';
          report.finalStatus = 'pending';
        }
        appendOrderTimeline(orderId, 'ai_reupload_required', {
          performedBy: 'operations',
          detail: 'Previous PDF could not be processed — upload a clearer lab report',
        });
        return job;
      },
      () => this.post<AIExtractionJob>(`/admin/orders/${orderId}/ai-extraction/reupload`),
    );
  }

  async verifyExtraction(orderId: string, verifiedBy = 'operations'): Promise<AIExtractionJob> {
    return mockOrApi(
      async () => {
        const job = MOCK_AI_JOBS[orderId];
        if (!job) throw new Error('No extraction job for this order');
        job.fields = job.fields.map((f) => ({ ...f, verified: true }));
        job.status = 'verified';
        job.verifiedBy = verifiedBy;
        job.verifiedAt = new Date().toISOString();
        job.updatedAt = job.verifiedAt;
        MOCK_AI_JOBS[orderId] = job;

        const report = MOCK_LAB_REPORTS[orderId];
        if (report) {
          report.extractionStatus = 'verified';
          report.finalStatus = 'verified';
          report.verifiedBy = verifiedBy;
          report.verifiedAt = job.verifiedAt;
        }

        try {
          await liverCareOrderService.transition(orderId, 'verify_ai');
        } catch {
          // ok
        }
        appendOrderTimeline(orderId, 'ai_verified', {
          performedBy: verifiedBy,
          detail: `${job.fields.length} fields verified — ready for letterhead report`,
          metadata: { fieldCount: String(job.fields.length), verifiedBy },
        });
        notifyOps('Pathology verified', 'Generate final Livotale letterhead report on order detail.', 'ai_verified', orderId);
        return job;
      },
      () => this.post<AIExtractionJob>(`/admin/orders/${orderId}/ai-extraction/verify`),
    );
  }
}

export const aiExtractionOrderService = new AIExtractionOrderService();
