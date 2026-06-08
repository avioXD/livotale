export interface PartnerLabDocument {
  id: string;
  label: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
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
  contactPerson: string;
  phone: string;
  email: string;
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

export type UpdatePartnerLabInput = Partial<Omit<PartnerLab, 'id' | 'createdAt' | 'updatedAt'>>;
