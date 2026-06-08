export type EnquirySource = 'website' | 'whatsapp' | 'manual';

export type EnquiryStatus =
  | 'new'
  | 'contacted'
  | 'interested'
  | 'not_interested'
  | 'follow_up_required'
  | 'converted'
  | 'closed';

/** Single CRM follow-up touchpoint — appended as a log, not overwritten. */
export interface EnquiryFollowUpLog {
  id: string;
  status: EnquiryStatus;
  internalNotes?: string | null;
  callRemarks?: string | null;
  followUpAt?: string | null;
  createdAt: string;
  createdByName?: string | null;
}

/** Post-conversion order result when payment/order did not complete. */
export type EnquiryOrderOutcome =
  | 'confirmed'
  | 'cancelled'
  | 'payment_failed'
  | 'defaulter';

export interface Enquiry {
  id: string;
  enquiryNumber: string;
  /** Groups repeat enquiries from the same lead (by phone). */
  threadId: string;
  /** 1-based sequence within the thread (new thread on each return visit). */
  threadSequence: number;
  source: EnquirySource;
  patientName: string;
  phone: string;
  email?: string | null;
  age?: number | null;
  gender?: string | null;
  city?: string | null;
  address?: string | null;
  preferredPackageId?: string | null;
  preferredPackageCode?: string | null;
  message?: string | null;
  enquiryAt: string;
  assignedExecutiveId?: string | null;
  assignedExecutiveName?: string | null;
  status: EnquiryStatus;
  followUpAt?: string | null;
  /** Chronological CRM follow-up log (newest last). */
  followUpLogs?: EnquiryFollowUpLog[];
  internalNotes?: string | null;
  callRemarks?: string | null;
  patientId?: string | null;
  orderId?: string | null;
  orderOutcome?: EnquiryOrderOutcome | null;
  orderOutcomeRemarks?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Populated on list API — total enquiries in this thread. */
  threadCount?: number;
}

export interface CreateEnquiryInput {
  source: EnquirySource;
  patientName: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: string;
  city?: string;
  address?: string;
  preferredPackageId?: string;
  message?: string;
}

export interface AddEnquiryFollowUpInput {
  status: EnquiryStatus;
  internalNotes?: string;
  callRemarks?: string;
  followUpAt?: string | null;
  createdByName?: string;
}

export interface UpdateEnquiryInput {
  status?: EnquiryStatus;
  assignedExecutiveId?: string;
  followUpAt?: string | null;
  internalNotes?: string;
  callRemarks?: string;
  patientName?: string;
  phone?: string;
  email?: string;
  age?: number;
  gender?: string;
  city?: string;
  address?: string;
  preferredPackageId?: string | null;
  orderOutcome?: EnquiryOrderOutcome | null;
  orderOutcomeRemarks?: string | null;
}
