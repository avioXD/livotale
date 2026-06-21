import type { IAIExtractionService } from './types';
import type { AIExtractionJob, ExtractedField } from '@/types/aiExtraction';

const jobs = new Map<string, AIExtractionJob>();

const PATHOLOGY_FIELDS: Omit<ExtractedField, 'id' | 'verified'>[] = [
  { fieldName: 'Hemoglobin', extractedValue: '13.2', editableValue: '13.2', unit: 'g/dL', referenceRange: '12.0–16.0', flag: 'normal', confidenceScore: 0.94, sourcePage: 1 },
  { fieldName: 'Platelet count', extractedValue: '185000', editableValue: '185000', unit: '/µL', referenceRange: '150000–400000', flag: 'normal', confidenceScore: 0.91, sourcePage: 1 },
  { fieldName: 'SGOT/AST', extractedValue: '42', editableValue: '42', unit: 'U/L', referenceRange: '10–40', flag: 'high', confidenceScore: 0.88, sourcePage: 2 },
  { fieldName: 'SGPT/ALT', extractedValue: '38', editableValue: '38', unit: 'U/L', referenceRange: '7–56', flag: 'normal', confidenceScore: 0.90, sourcePage: 2 },
  { fieldName: 'Total bilirubin', extractedValue: '0.9', editableValue: '0.9', unit: 'mg/dL', referenceRange: '0.2–1.2', flag: 'normal', confidenceScore: 0.92, sourcePage: 2 },
  { fieldName: 'Albumin', extractedValue: '4.1', editableValue: '4.1', unit: 'g/dL', referenceRange: '3.5–5.5', flag: 'normal', confidenceScore: 0.87, sourcePage: 2 },
  { fieldName: 'HBsAg', extractedValue: 'Negative', editableValue: 'Negative', unit: '', referenceRange: 'Negative', flag: 'normal', confidenceScore: 0.96, sourcePage: 3 },
  { fieldName: 'Anti-HCV', extractedValue: 'Negative', editableValue: 'Negative', unit: '', referenceRange: 'Negative', flag: 'normal', confidenceScore: 0.95, sourcePage: 3 },
];

function toFields(source: Omit<ExtractedField, 'id' | 'verified'>[]): ExtractedField[] {
  return source.map((f, i) => ({ ...f, id: `field-${i}`, verified: false }));
}

export class DummyAIExtractionService implements IAIExtractionService {
  async queueExtraction(orderId: string, sourceType: 'pathology' | 'fibrosis_scan', fileId?: string): Promise<AIExtractionJob> {
    const job: AIExtractionJob = {
      id: `ai-job-${Date.now()}`,
      orderId,
      sourceType,
      sourceFileId: fileId ?? null,
      status: 'queued',
      fields: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    jobs.set(job.id, job);
    return job;
  }

  async getJob(jobId: string): Promise<AIExtractionJob> {
    const job = jobs.get(jobId);
    if (!job) throw new Error('AI extraction job not found');
    return job;
  }

  async processJob(jobId: string): Promise<AIExtractionJob> {
    const job = await this.getJob(jobId);
    job.status = 'processing';
    job.updatedAt = new Date().toISOString();
    await new Promise((r) => setTimeout(r, 300));
    job.status = 'extracted';
    job.fields = toFields(PATHOLOGY_FIELDS);
    job.updatedAt = new Date().toISOString();
    jobs.set(jobId, job);
    return job;
  }
}

export const dummyAIExtractionService = new DummyAIExtractionService();
