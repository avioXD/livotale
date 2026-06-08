import { create } from 'zustand';
import { enquiryService, liverCareOrderService, packageService } from '@/services/liverCare';
import type {
  CreateEnquiryInput,
  Enquiry,
  EnquiryOrderOutcome,
  EnquiryStatus,
  UpdateEnquiryInput,
} from '@/types/enquiry';
import type { LiverCarePackage } from '@/types/package';
import { useEnquiriesAdminStore } from './enquiriesAdminStore';

export interface EnquiryFollowUpDraft {
  status: EnquiryStatus;
  internalNotes: string;
  callRemarks: string;
  followUpAt: string;
  preferredPackageId: string;
}

export interface EnquiryDetailsDraft {
  patientName: string;
  phone: string;
  email: string;
  city: string;
  message: string;
  preferredPackageId: string;
}

export interface EnquiryOrderOutcomeDraft {
  orderOutcome: EnquiryOrderOutcome;
  orderOutcomeRemarks: string;
}

interface EnquiryDetailStore {
  enquiry: Enquiry | null;
  threadEnquiries: Enquiry[];
  packages: LiverCarePackage[];
  followUp: EnquiryFollowUpDraft;
  details: EnquiryDetailsDraft;
  orderOutcome: EnquiryOrderOutcomeDraft;
  isLoading: boolean;
  isSaving: boolean;
  isConverting: boolean;
  isStartingThread: boolean;
  error: string | null;
  loadById: (id: string) => Promise<void>;
  initCreate: () => Promise<void>;
  patchFollowUp: (patch: Partial<EnquiryFollowUpDraft>) => void;
  patchDetails: (patch: Partial<EnquiryDetailsDraft>) => void;
  patchOrderOutcome: (patch: Partial<EnquiryOrderOutcomeDraft>) => void;
  createLead: (input: CreateEnquiryInput) => Promise<Enquiry>;
  createNewThread: (fromEnquiryId: string) => Promise<Enquiry>;
  saveFollowUp: (id: string) => Promise<Enquiry>;
  saveDetails: (id: string) => Promise<Enquiry>;
  saveOrderOutcome: (id: string) => Promise<Enquiry>;
  convertToOrder: (id: string) => Promise<string>;
  clear: () => void;
}

const emptyFollowUp = (status: EnquiryStatus = 'new', preferredPackageId = ''): EnquiryFollowUpDraft => ({
  status,
  internalNotes: '',
  callRemarks: '',
  followUpAt: '',
  preferredPackageId,
});

const emptyOrderOutcome = (): EnquiryOrderOutcomeDraft => ({
  orderOutcome: 'confirmed',
  orderOutcomeRemarks: '',
});

const emptyDetails = (): EnquiryDetailsDraft => ({
  patientName: '',
  phone: '',
  email: '',
  city: '',
  message: '',
  preferredPackageId: '',
});

function detailsFromEnquiry(enquiry: Enquiry): EnquiryDetailsDraft {
  return {
    patientName: enquiry.patientName,
    phone: enquiry.phone,
    email: enquiry.email ?? '',
    city: enquiry.city ?? '',
    message: enquiry.message ?? '',
    preferredPackageId: enquiry.preferredPackageId ?? '',
  };
}

export const useEnquiryDetailStore = create<EnquiryDetailStore>((set, get) => ({
  enquiry: null,
  threadEnquiries: [],
  packages: [],
  followUp: emptyFollowUp(),
  details: emptyDetails(),
  orderOutcome: emptyOrderOutcome(),
  isLoading: false,
  isSaving: false,
  isConverting: false,
  isStartingThread: false,
  error: null,

  loadById: async (id) => {
    set({ isLoading: true, error: null, enquiry: null, threadEnquiries: [] });
    try {
      const enquiry = await enquiryService.getById(id);
      if (!enquiry) {
        set({ isLoading: false });
        return;
      }
      const [packages, threadEnquiries] = await Promise.all([
        packageService.listAdmin(),
        enquiryService.getThread(enquiry.threadId),
      ]);
      const preferredPackageId = enquiry.preferredPackageId ?? packages[0]?.id ?? '';
      set({
        enquiry,
        threadEnquiries,
        packages,
        followUp: emptyFollowUp(enquiry.status, preferredPackageId),
        details: detailsFromEnquiry({ ...enquiry, preferredPackageId }),
        orderOutcome: {
          orderOutcome: enquiry.orderOutcome ?? 'confirmed',
          orderOutcomeRemarks: enquiry.orderOutcomeRemarks ?? '',
        },
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load enquiry',
      });
    }
  },

  createNewThread: async (fromEnquiryId) => {
    set({ isStartingThread: true, error: null });
    try {
      const created = await enquiryService.createNewThread(fromEnquiryId);
      useEnquiriesAdminStore.getState().upsertEnquiry(created);
      set({ isStartingThread: false });
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start new thread';
      set({ isStartingThread: false, error: message });
      throw err;
    }
  },

  initCreate: async () => {
    set({
      isLoading: true,
      error: null,
      enquiry: null,
      threadEnquiries: [],
      followUp: emptyFollowUp(),
      details: emptyDetails(),
      orderOutcome: emptyOrderOutcome(),
    });
    try {
      const packages = await packageService.listAdmin();
      set({ packages, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to prepare form',
      });
    }
  },

  patchFollowUp: (patch) => {
    set({ followUp: { ...get().followUp, ...patch } });
  },

  patchDetails: (patch) => {
    set({ details: { ...get().details, ...patch } });
  },

  patchOrderOutcome: (patch) => {
    set({ orderOutcome: { ...get().orderOutcome, ...patch } });
  },

  createLead: async (input) => {
    if (!input.patientName.trim() || !input.phone.trim()) {
      const message = 'Name and phone are required.';
      set({ error: message });
      throw new Error(message);
    }
    set({ isSaving: true, error: null });
    try {
      const enquiry = await enquiryService.create({
        ...input,
        patientName: input.patientName.trim(),
        phone: input.phone.trim(),
      });
      useEnquiriesAdminStore.getState().upsertEnquiry(enquiry);
      set({ isSaving: false });
      return enquiry;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add lead';
      set({ isSaving: false, error: message });
      throw err;
    }
  },

  saveFollowUp: async (id) => {
    const { followUp, enquiry } = get();
    if (!enquiry) throw new Error('No enquiry loaded');
    const hasNotes = followUp.internalNotes.trim() || followUp.callRemarks.trim();
    if (!hasNotes && followUp.status === enquiry.status && !followUp.followUpAt) {
      const message = 'Add notes, change status, or set a next follow-up date.';
      set({ error: message });
      throw new Error(message);
    }
    set({ isSaving: true, error: null });
    try {
      const updated = await enquiryService.addFollowUp(id, {
        status: followUp.status,
        internalNotes: followUp.internalNotes.trim() || undefined,
        callRemarks: followUp.callRemarks.trim() || undefined,
        followUpAt: followUp.followUpAt
          ? new Date(followUp.followUpAt).toISOString()
          : null,
      });
      set({
        enquiry: updated,
        followUp: emptyFollowUp(updated.status, followUp.preferredPackageId),
        isSaving: false,
      });
      useEnquiriesAdminStore.getState().upsertEnquiry(updated);
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      set({ isSaving: false, error: message });
      throw err;
    }
  },

  saveDetails: async (id) => {
    const { details, enquiry } = get();
    if (!enquiry) throw new Error('No enquiry loaded');
    if (!details.patientName.trim() || !details.phone.trim()) {
      const message = 'Name and phone are required.';
      set({ error: message });
      throw new Error(message);
    }
    set({ isSaving: true, error: null });
    try {
      const payload: UpdateEnquiryInput = {
        patientName: details.patientName.trim(),
        phone: details.phone.trim(),
        email: details.email.trim() || undefined,
        city: details.city.trim() || undefined,
        message: details.message.trim() || undefined,
        preferredPackageId: details.preferredPackageId || null,
      };
      const updated = await enquiryService.update(id, payload);
      const preferredPackageId = updated.preferredPackageId ?? get().followUp.preferredPackageId;
      set({
        enquiry: updated,
        details: detailsFromEnquiry(updated),
        followUp: { ...get().followUp, preferredPackageId },
        isSaving: false,
      });
      useEnquiriesAdminStore.getState().upsertEnquiry(updated);
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      set({ isSaving: false, error: message });
      throw err;
    }
  },

  saveOrderOutcome: async (id) => {
    const { orderOutcome, enquiry } = get();
    if (!enquiry) throw new Error('No enquiry loaded');
    set({ isSaving: true, error: null });
    try {
      const updated = await enquiryService.update(id, {
        orderOutcome: orderOutcome.orderOutcome,
        orderOutcomeRemarks: orderOutcome.orderOutcomeRemarks.trim() || undefined,
        status:
          orderOutcome.orderOutcome === 'cancelled' ||
          orderOutcome.orderOutcome === 'payment_failed' ||
          orderOutcome.orderOutcome === 'defaulter'
            ? 'closed'
            : enquiry.status,
      });
      set({
        enquiry: updated,
        orderOutcome: {
          orderOutcome: updated.orderOutcome ?? orderOutcome.orderOutcome,
          orderOutcomeRemarks: updated.orderOutcomeRemarks ?? '',
        },
        isSaving: false,
      });
      useEnquiriesAdminStore.getState().upsertEnquiry(updated);
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      set({ isSaving: false, error: message });
      throw err;
    }
  },

  convertToOrder: async (id) => {
    const { enquiry, followUp } = get();
    if (!enquiry || !followUp.preferredPackageId) {
      throw new Error('Select a package before creating an order');
    }
    set({ isConverting: true, error: null });
    try {
      const reuseExistingPatient = Boolean(enquiry.patientId);
      const patientId =
        enquiry.patientId ?? `patient-${enquiry.phone.replace(/\D/g, '')}`;
      const order = await liverCareOrderService.create({
        patientId,
        patientName: enquiry.patientName,
        patientPhone: enquiry.phone,
        enquiryId: enquiry.id,
        packageId: followUp.preferredPackageId,
        skipPatientCreation: reuseExistingPatient,
      });

      const callRemarks = followUp.callRemarks.trim();
      const internalNotes = followUp.internalNotes.trim();
      const pkg = get().packages.find((p) => p.id === followUp.preferredPackageId);
      let updated = await enquiryService.getById(id);

      if (updated && (callRemarks || internalNotes)) {
        const orderNote = `Order ${order.orderNumber}${pkg ? ` — ${pkg.code}` : ''} created`;
        updated = await enquiryService.addFollowUp(id, {
          status: 'converted',
          callRemarks: callRemarks || undefined,
          internalNotes: internalNotes ? `${internalNotes}\n${orderNote}` : orderNote,
        });
      }

      if (updated) {
        set({
          enquiry: updated,
          followUp: emptyFollowUp('converted', followUp.preferredPackageId),
          isConverting: false,
        });
        useEnquiriesAdminStore.getState().upsertEnquiry(updated);
      } else {
        set({ isConverting: false });
      }
      return order.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Convert failed';
      set({ isConverting: false, error: message });
      throw err;
    }
  },

  clear: () =>
    set({
      enquiry: null,
      threadEnquiries: [],
      packages: [],
      followUp: emptyFollowUp(),
      details: emptyDetails(),
      orderOutcome: emptyOrderOutcome(),
      isLoading: false,
      isSaving: false,
      isConverting: false,
      isStartingThread: false,
      error: null,
    }),
}));
