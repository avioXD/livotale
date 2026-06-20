import type {
  PartnerLab,
  PartnerLabDocument,
  PartnerLabDraft,
  PartnerLabPoc,
} from '@/types/partnerLab';

export function newPocId(): string {
  return `poc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newDocumentId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyPartnerLabDraft(): PartnerLabDraft {
  return {
    name: '',
    contactPerson: '',
    contactDesignation: '',
    phone: '',
    email: '',
    pocContacts: [],
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
    registrationNumber: '',
    supportedTests: [],
    legalDocuments: [],
    agreementDoc: null,
    reportFormatSample: null,
    chargesPerTest: [],
    packageCharges: null,
    annualTieupCharges: null,
    billingCycle: 'monthly',
    contractStart: '',
    contractEnd: '',
    active: true,
    notes: '',
  };
}

export function draftFromPartnerLab(lab: PartnerLab): PartnerLabDraft {
  const { id: _id, createdAt: _c, updatedAt: _u, ...draft } = lab;
  return {
    ...draft,
    pocContacts: lab.pocContacts.map((p) => ({ ...p })),
    legalDocuments: lab.legalDocuments.map((d) => ({ ...d })),
    supportedTests: [...lab.supportedTests],
    chargesPerTest: lab.chargesPerTest.map((c) => ({ ...c })),
  };
}

export function normalizePartnerLabDraft(draft: PartnerLabDraft): PartnerLabDraft {
  const contactPerson = draft.contactPerson.trim();
  return {
    ...draft,
    name: draft.name.trim(),
    contactPerson,
    contactDesignation: draft.contactDesignation?.trim() || null,
    phone: draft.phone.trim(),
    email: draft.email.trim(),
    address: draft.address.trim(),
    city: draft.city.trim(),
    state: draft.state.trim(),
    pincode: draft.pincode.trim(),
    gstNumber: draft.gstNumber?.trim() || null,
    registrationNumber: draft.registrationNumber?.trim() || null,
    notes: draft.notes?.trim() || null,
    contractStart: draft.contractStart?.trim() || null,
    contractEnd: draft.contractEnd?.trim() || null,
    supportedTests: draft.supportedTests.map((t) => t.trim()).filter(Boolean),
    pocContacts: draft.pocContacts
      .map((p) => ({
        ...p,
        name: p.name.trim(),
        designation: p.designation.trim(),
        phone: p.phone.trim(),
        email: p.email.trim(),
      }))
      .filter((p) => p.name || p.phone || p.email),
    chargesPerTest: draft.chargesPerTest.filter((c) => c.testName.trim() && c.chargeInr >= 0),
  };
}

export function isPartnerLabDraftValid(draft: PartnerLabDraft): boolean {
  const d = normalizePartnerLabDraft(draft);
  return Boolean(
    d.name &&
      d.contactPerson &&
      d.phone &&
      d.email &&
      d.address &&
      d.city &&
      d.state &&
      d.pincode,
  );
}

export function demoDocumentFromFile(label: string, file: File): PartnerLabDocument {
  return {
    id: newDocumentId(),
    label,
    fileName: file.name,
    fileUrl: URL.createObjectURL(file),
    uploadedAt: new Date().toISOString(),
  };
}

export function emptyPocRow(): PartnerLabPoc {
  return { id: newPocId(), name: '', designation: '', phone: '', email: '' };
}
