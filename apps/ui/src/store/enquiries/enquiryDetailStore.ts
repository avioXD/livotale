import { create } from 'zustand';
import { isPatientIntakeValid } from '@/app/pages/shared/components/PatientIntakeForm';
import { patientIntakeFromEnquiry, EMPTY_ORDER_INTAKE } from '@/app/pages/shared/components/patientIntakeUtils';
import { enquiryService, liverCareOrderService, packageService, technicianOrderService } from '@/services/liverCare';
import type { ScanPatientIntakeInput } from '@/types/scanPatientIntake';
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
  age: string;
  gender: string;
  address: string;
  assignedExecutiveId: string;
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
  orderIntake: ScanPatientIntakeInput;
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
  patchOrderIntake: (patch: Partial<ScanPatientIntakeInput>) => void;
  patchDetails: (patch: Partial<EnquiryDetailsDraft>) => void;
  patchOrderOutcome: (patch: Partial<EnquiryOrderOutcomeDraft>) => void;
  createLead: (input: CreateEnquiryInput) => Promise<Enquiry>;
  createNewThread: (fromEnquiryId: string) => Promise<Enquiry>;
  saveFollowUp: (id: string) => Promise<Enquiry>;
  saveDetails: (id: string) => Promise<Enquiry>;
  saveOrderOutcome: (id: string) => Promise<Enquiry>;
  convertToOrder: (id: string) => Promise<string>;
  archiveLead: (id: string) => Promise<void>;
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
  age: '',
  gender: '',
  address: '',
  assignedExecutiveId: '',
});

function detailsFromEnquiry(enquiry: Enquiry): EnquiryDetailsDraft {
  return {
    patientName: enquiry.patientName,
    phone: enquiry.phone,
    email: enquiry.email ?? '',
    city: enquiry.city ?? '',
    message: enquiry.message ?? '',
    preferredPackageId: enquiry.preferredPackageId ?? '',
    age: enquiry.age != null ? String(enquiry.age) : '',
    gender: enquiry.gender ?? '',
    address: enquiry.address ?? '',
    assignedExecutiveId: enquiry.assignedExecutiveId ?? '',
  };
}

export const useEnquiryDetailStore = create<EnquiryDetailStore>((set, get) => ({
  enquiry: null,
  threadEnquiries: [],
  packages: [],
  followUp: emptyFollowUp(),
  orderIntake: EMPTY_ORDER_INTAKE,
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
        orderIntake: patientIntakeFromEnquiry(enquiry),
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
      orderIntake: EMPTY_ORDER_INTAKE,
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

  patchOrderIntake: (patch) => {
    set({ orderIntake: { ...get().orderIntake, ...patch } });
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
        age: details.age.trim() ? Number(details.age) : undefined,
        gender: details.gender.trim() || undefined,
        address: details.address.trim() || undefined,
        assignedExecutiveId: details.assignedExecutiveId.trim() || null,
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
    const { enquiry, followUp, orderIntake } = get();
    if (!enquiry || !followUp.preferredPackageId) {
      throw new Error('Select a package before creating an order');
    }
    if (!isPatientIntakeValid(orderIntake)) {
      throw new Error('Enter patient name, age, and phone before creating an order');
    }
    set({ isConverting: true, error: null });
    try {
      const reuseExistingPatient = Boolean(enquiry.patientId);
      const order = await liverCareOrderService.create({
        patientId: enquiry.patientId,
        patientName: orderIntake.name.trim(),
        patientPhone: orderIntake.phone.trim(),
        patientIntake: orderIntake,
        enquiryId: enquiry.id,
        packageId: followUp.preferredPackageId,
        skipPatientCreation: reuseExistingPatient,
      });

      await technicianOrderService.saveOperatorIntake(order.id, orderIntake);

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

  archiveLead: async (id) => {
    set({ isSaving: true, error: null });
    try {
      await enquiryService.archive(id);
      useEnquiriesAdminStore.getState().removeEnquiry(id);
      set({ isSaving: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Archive failed';
      set({ isSaving: false, error: message });
      throw err;
    }
  },

  clear: () =>
    set({
      enquiry: null,
      threadEnquiries: [],
      packages: [],
      followUp: emptyFollowUp(),
      orderIntake: EMPTY_ORDER_INTAKE,
      details: emptyDetails(),
      orderOutcome: emptyOrderOutcome(),
      isLoading: false,
      isSaving: false,
      isConverting: false,
      isStartingThread: false,
      error: null,
    }),
}));
