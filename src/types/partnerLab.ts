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
  annualTieupCharges?: number | null;
  contractStart?: string | null;
  contractEnd?: string | null;
  active: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UpdatePartnerLabInput = Partial<Omit<PartnerLab, 'id' | 'createdAt' | 'updatedAt'>>;
