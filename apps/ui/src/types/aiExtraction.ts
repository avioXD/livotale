export type AIExtractionStatus =
  | 'not_started'
  | 'queued'
  | 'processing'
  | 'extracted'
  | 'review_pending'
  | 'verified'
  | 'failed'
  | 'reupload_required';

export type ExtractionFieldFlag = 'normal' | 'high' | 'low' | 'critical';

export interface ExtractedField {
  id: string;
  fieldName: string;
  extractedValue: string;
  editableValue: string;
  unit?: string | null;
  referenceRange?: string | null;
  flag: ExtractionFieldFlag;
  confidenceScore: number;
  sourcePage?: number | null;
  verified: boolean;
}

export interface AIExtractionJob {
  id: string;
  orderId: string;
  sourceType: 'pathology' | 'fibrosis_scan';
  sourceFileId?: string | null;
  status: AIExtractionStatus;
  fields: ExtractedField[];
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
