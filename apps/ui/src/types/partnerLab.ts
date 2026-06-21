export interface PartnerLabDocument {
  id: string;
  label: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface PartnerLabPoc {
  id: string;
  name: string;
  designation: string;
  phone: string;
  email: string;
}

export interface PartnerLabTestCharge {
  testName: string;
  chargeInr: number;
}

export type PartnerLabBillingCycle = 'monthly' | 'quarterly' | 'annual';

export interface PartnerLabStats {
  ordersAssigned: number;
  samplesDispatched: number;
  samplesReceived: number;
  reportsUploaded: number;
  reportsVerified: number;
  letterheadPublished: number;
  inPipeline: number;
}

export interface PartnerLab {
  id: string;
  name: string;
  /** Primary point of contact — synced from the primary POC row when saved. */
  contactPerson: string;
  /** Primary POC designation (e.g. Lab Director, Ops coordinator). */
  contactDesignation?: string | null;
  phone: string;
  email: string;
  /** Additional points of contact beyond the primary POC. */
  pocContacts: PartnerLabPoc[];
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber?: string | null;
  registrationNumber?: string | null;
  supportedTests: string[];
  legalDocuments: PartnerLabDocument[];
  agreementDoc?: PartnerLabDocument | null;
  reportFormatSample?: PartnerLabDocument | null;
  chargesPerTest: PartnerLabTestCharge[];
  packageCharges?: number | null;
  annualTieupCharges?: number | null;
  billingCycle: PartnerLabBillingCycle;
  contractStart?: string | null;
  contractEnd?: string | null;
  active: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerLabDetail extends PartnerLab {
  stats: PartnerLabStats;
  /** Estimated pathology billing for verified reports in the current period (mock). */
  estimatedBillingInr: number;
}

export type PartnerLabDraft = Omit<PartnerLab, 'id' | 'createdAt' | 'updatedAt'>;

export type CreatePartnerLabInput = PartnerLabDraft;

export type UpdatePartnerLabInput = Partial<PartnerLabDraft>;
