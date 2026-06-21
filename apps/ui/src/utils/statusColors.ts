import type { VariantProps } from 'class-variance-authority';
import type { badgeVariants } from '@/components/ui/badge';
import type { AIExtractionStatus } from '@/types/aiExtraction';
import type { ConsultationQueueStage } from '@/types/consultationQueue';
import type { EnquiryStatus } from '@/types/enquiry';
import type { LiverCarePaymentStatus, OrderStatus } from '@/types/serviceOrder';
import type { SampleDispatchStatus } from '@/types/sampleDispatch';

export type StatusBadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export type StatusDomain =
  | 'order'
  | 'payment'
  | 'appointment'
  | 'consultationStage'
  | 'aiExtraction'
  | 'sampleDispatch'
  | 'enquiry'
  | 'verification'
  | 'consent'
  | 'generic';

/** Human-readable label from snake_case status codes. */
export function formatStatusLabel(status: string): string {
  return (status || 'unknown').replace(/_/g, ' ');
}

const ORDER_STATUS_VARIANTS: Record<OrderStatus, StatusBadgeVariant> = {
  draft: 'outline',
  created: 'info',
  payment_pending: 'warning',
  payment_completed: 'success',
  technician_assigned: 'default',
  scan_scheduled: 'info',
  scan_in_progress: 'default',
  scan_completed: 'success',
  pathology_pending: 'warning',
  lab_report_uploaded: 'success',
  ai_extraction_pending: 'warning',
  ai_extraction_completed: 'success',
  report_review_pending: 'warning',
  final_report_generated: 'success',
  doctor_assignment_pending: 'warning',
  doctor_assigned: 'default',
  consultation_pending: 'warning',
  prescription_pending: 'warning',
  prescription_generated: 'success',
  completed: 'success',
  cancelled: 'destructive',
};

const PAYMENT_STATUS_VARIANTS: Record<LiverCarePaymentStatus, StatusBadgeVariant> = {
  pending: 'warning',
  link_sent: 'info',
  processing: 'default',
  success: 'success',
  failed: 'destructive',
  refunded: 'outline',
  cancelled: 'destructive',
};

const APPOINTMENT_STATUS_VARIANTS: Record<string, StatusBadgeVariant> = {
  booked: 'info',
  assigned: 'default',
  in_progress: 'default',
  completed: 'success',
  cancelled: 'destructive',
  rescheduled: 'info',
  no_show: 'destructive',
};

const CONSULTATION_STAGE_VARIANTS: Record<ConsultationQueueStage, StatusBadgeVariant> = {
  awaiting_doctor: 'warning',
  doctor_assigned: 'default',
  scheduled: 'info',
  prescription_pending: 'warning',
  prescription_ready: 'success',
  completed: 'success',
};

const AI_EXTRACTION_VARIANTS: Record<AIExtractionStatus, StatusBadgeVariant> = {
  not_started: 'outline',
  queued: 'info',
  processing: 'default',
  extracted: 'info',
  review_pending: 'warning',
  verified: 'success',
  failed: 'destructive',
  reupload_required: 'destructive',
};

const SAMPLE_DISPATCH_VARIANTS: Record<SampleDispatchStatus, StatusBadgeVariant> = {
  not_required: 'outline',
  pending_dispatch: 'warning',
  sample_collected: 'default',
  dispatched: 'default',
  received_at_lab: 'info',
  awaiting_report: 'warning',
  report_uploaded: 'success',
  cancelled: 'destructive',
};

const ENQUIRY_STATUS_VARIANTS: Record<EnquiryStatus, StatusBadgeVariant> = {
  new: 'default',
  contacted: 'info',
  interested: 'success',
  follow_up_required: 'warning',
  converted: 'success',
  not_interested: 'outline',
  closed: 'outline',
};

const VERIFICATION_STATUS_VARIANTS: Record<string, StatusBadgeVariant> = {
  approved: 'success',
  rejected: 'destructive',
  pending: 'warning',
  draft: 'outline',
};

const CONSENT_STATUS_VARIANTS: Record<string, StatusBadgeVariant> = {
  accepted: 'success',
  pending: 'warning',
  declined: 'destructive',
};

/** Keyword fallback when domain-specific mapping is unavailable. */
export function resolveGenericStatusVariant(status: string): StatusBadgeVariant {
  const normalized = status.toLowerCase();

  if (
    /cancelled|canceled|failed|error|rejected|declined|not_interested|no_show|reupload|defaulter/.test(
      normalized,
    )
  ) {
    return 'destructive';
  }

  if (
    /completed|success|verified|approved|accepted|converted|ready|generated|uploaded|paid|published|delivered/.test(
      normalized,
    )
  ) {
    return 'success';
  }

  if (
    /pending|awaiting|review|follow_up|required|unpaid|draft_payment|link_sent/.test(normalized)
  ) {
    return 'warning';
  }

  if (/processing|in_progress|assigned|active|queued|new|contacted|scheduled|booked|created/.test(normalized)) {
    if (/pending|awaiting/.test(normalized)) return 'warning';
    if (/completed|success/.test(normalized)) return 'success';
    if (/new|processing|in_progress|assigned/.test(normalized)) return 'default';
    return 'info';
  }

  if (/draft|not_started|not_required|closed|refunded|rescheduled|outline/.test(normalized)) {
    return 'outline';
  }

  return 'secondary';
}

export function getOrderStatusVariant(status: OrderStatus): StatusBadgeVariant {
  return ORDER_STATUS_VARIANTS[status] ?? resolveGenericStatusVariant(status);
}

export function getPaymentStatusVariant(status: LiverCarePaymentStatus | string): StatusBadgeVariant {
  if (status in PAYMENT_STATUS_VARIANTS) {
    return PAYMENT_STATUS_VARIANTS[status as LiverCarePaymentStatus];
  }
  return resolveGenericStatusVariant(status);
}

export function getAppointmentStatusVariant(status: string): StatusBadgeVariant {
  return APPOINTMENT_STATUS_VARIANTS[status] ?? resolveGenericStatusVariant(status);
}

export function getConsultationStageVariant(stage: ConsultationQueueStage): StatusBadgeVariant {
  return CONSULTATION_STAGE_VARIANTS[stage];
}

export function getAiExtractionStatusVariant(status: AIExtractionStatus | string | null): StatusBadgeVariant {
  if (!status) return 'outline';
  if (status in AI_EXTRACTION_VARIANTS) {
    return AI_EXTRACTION_VARIANTS[status as AIExtractionStatus];
  }
  return resolveGenericStatusVariant(status);
}

export function getSampleDispatchStatusVariant(status: SampleDispatchStatus | string): StatusBadgeVariant {
  if (status in SAMPLE_DISPATCH_VARIANTS) {
    return SAMPLE_DISPATCH_VARIANTS[status as SampleDispatchStatus];
  }
  return resolveGenericStatusVariant(status);
}

export function getEnquiryStatusVariant(status: EnquiryStatus | string): StatusBadgeVariant {
  if (status in ENQUIRY_STATUS_VARIANTS) {
    return ENQUIRY_STATUS_VARIANTS[status as EnquiryStatus];
  }
  return resolveGenericStatusVariant(status);
}

export function getVerificationStatusVariant(status: string): StatusBadgeVariant {
  return VERIFICATION_STATUS_VARIANTS[status] ?? resolveGenericStatusVariant(status);
}

export function getConsentStatusVariant(accepted: boolean): StatusBadgeVariant {
  return accepted ? CONSENT_STATUS_VARIANTS.accepted : CONSENT_STATUS_VARIANTS.pending;
}

export function resolveStatusBadgeVariant(
  status: string,
  domain: StatusDomain = 'generic',
): StatusBadgeVariant {
  switch (domain) {
    case 'order':
      return getOrderStatusVariant(status as OrderStatus);
    case 'payment':
      return getPaymentStatusVariant(status);
    case 'appointment':
      return getAppointmentStatusVariant(status);
    case 'consultationStage':
      return getConsultationStageVariant(status as ConsultationQueueStage);
    case 'aiExtraction':
      return getAiExtractionStatusVariant(status);
    case 'sampleDispatch':
      return getSampleDispatchStatusVariant(status);
    case 'enquiry':
      return getEnquiryStatusVariant(status);
    case 'verification':
      return getVerificationStatusVariant(status);
    case 'consent':
      return status === 'accepted' || status === 'true'
        ? CONSENT_STATUS_VARIANTS.accepted
        : CONSENT_STATUS_VARIANTS.pending;
    default:
      return resolveGenericStatusVariant(status);
  }
}
