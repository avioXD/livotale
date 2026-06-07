import { create } from 'zustand';
import { doctorAppointmentsService } from '@/services';
import type {
  DoctorAppointmentDetail,
  DoctorAppointmentSummary,
  DoctorAvailabilityPayload,
  DoctorCalendarResponse,
  DoctorCalendarView,
  DoctorHoliday,
  AppointmentPrescriptionBundle,
  PrescriptionPdfInfo,
} from '@/types';

interface DoctorAppointmentsStore {
  calendar: DoctorCalendarResponse | null;
  appointments: DoctorAppointmentSummary[];
  selected: DoctorAppointmentDetail | null;
  prescriptionBundle: AppointmentPrescriptionBundle | null;
  prescriptionPdf: PrescriptionPdfInfo | null;
  availabilityRules: Array<Record<string, unknown>>;
  holidays: DoctorHoliday[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadCalendar: (params: { view?: DoctorCalendarView; date?: string }) => Promise<void>;
  loadList: (filter?: 'today' | 'upcoming' | 'completed' | 'missed') => Promise<void>;
  loadDetail: (id: string) => Promise<void>;
  loadPrescription: (appointmentId: string) => Promise<void>;
  savePrescription: (appointmentId: string, payload: Record<string, unknown>) => Promise<void>;
  approvePrescription: (appointmentId: string, payload: { doctorNotes?: string }) => Promise<void>;
  saveSignature: (payload: { registrationNumber: string; storageUrl: string; fileName?: string }) => Promise<void>;
  loadAvailability: () => Promise<void>;
  saveAvailability: (payload: DoctorAvailabilityPayload) => Promise<void>;
  loadHolidays: () => Promise<void>;
  createHoliday: (payload: {
    title: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }) => Promise<void>;
  startConsultation: (id: string) => Promise<void>;
  completeConsultation: (id: string, summary: string) => Promise<void>;
  markNoShow: (id: string, reason: string) => Promise<void>;
  requestReschedule: (id: string, reason: string) => Promise<void>;
  updateClinicalData: (id: string, payload: Record<string, unknown>) => Promise<void>;
  clearSelected: () => void;
  clearError: () => void;
}

export const useDoctorAppointmentsStore = create<DoctorAppointmentsStore>((set) => ({
  calendar: null,
  appointments: [],
  selected: null,
  prescriptionBundle: null,
  prescriptionPdf: null,
  availabilityRules: [],
  holidays: [],
  isLoading: false,
  isSaving: false,
  error: null,

  loadCalendar: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const calendar = await doctorAppointmentsService.getCalendar(params);
      set({ calendar, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load calendar',
      });
    }
  },

  loadList: async (filter = 'upcoming') => {
    set({ isLoading: true, error: null });
    try {
      const appointments = await doctorAppointmentsService.list(filter);
      set({ appointments, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load appointments',
      });
    }
  },

  loadDetail: async (id) => {
    set({ isLoading: true, error: null, prescriptionBundle: null, prescriptionPdf: null });
    try {
      const selected = await doctorAppointmentsService.getById(id);
      set({ selected, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load appointment',
      });
    }
  },

  loadPrescription: async (appointmentId) => {
    try {
      const prescriptionBundle = await doctorAppointmentsService.getPrescription(appointmentId);
      set({ prescriptionBundle });
      if (prescriptionBundle.prescription?.status === 'approved') {
        try {
          const prescriptionPdf = await doctorAppointmentsService.previewPrescriptionPdf(appointmentId);
          set({ prescriptionPdf });
        } catch {
          set({ prescriptionPdf: null });
        }
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load prescription',
      });
    }
  },

  savePrescription: async (appointmentId, payload) => {
    set({ isSaving: true, error: null });
    try {
      const prescriptionBundle = await doctorAppointmentsService.savePrescription(appointmentId, payload);
      set({ prescriptionBundle, isSaving: false });
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : 'Failed to save prescription',
      });
      throw err;
    }
  },

  approvePrescription: async (appointmentId, payload) => {
    set({ isSaving: true, error: null });
    try {
      await doctorAppointmentsService.approvePrescription(appointmentId, payload);
      const prescriptionBundle = await doctorAppointmentsService.getPrescription(appointmentId);
      let prescriptionPdf: PrescriptionPdfInfo | null = null;
      try {
        prescriptionPdf = await doctorAppointmentsService.previewPrescriptionPdf(appointmentId);
      } catch {
        prescriptionPdf = null;
      }
      set({ prescriptionBundle, prescriptionPdf, isSaving: false });
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : 'Failed to approve prescription',
      });
      throw err;
    }
  },

  saveSignature: async (payload) => {
    set({ isSaving: true, error: null });
    try {
      await doctorAppointmentsService.saveSignature(payload);
      set({ isSaving: false });
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : 'Failed to save signature',
      });
      throw err;
    }
  },

  loadAvailability: async () => {
    try {
      const data = await doctorAppointmentsService.getAvailability();
      set({ availabilityRules: data.rules });
    } catch {
      set({ availabilityRules: [] });
    }
  },

  saveAvailability: async (payload) => {
    set({ isSaving: true, error: null });
    try {
      const data = await doctorAppointmentsService.saveAvailability(payload);
      set({ availabilityRules: data.rules, isSaving: false });
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : 'Failed to save availability',
      });
      throw err;
    }
  },

  loadHolidays: async () => {
    try {
      const holidays = await doctorAppointmentsService.listHolidays();
      set({ holidays });
    } catch {
      set({ holidays: [] });
    }
  },

  createHoliday: async (payload) => {
    set({ isSaving: true, error: null });
    try {
      const created = await doctorAppointmentsService.createHoliday(payload);
      set((s) => ({ holidays: [created, ...s.holidays], isSaving: false }));
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : 'Failed to create holiday',
      });
      throw err;
    }
  },

  startConsultation: async (id) => {
    set({ isSaving: true, error: null });
    try {
      const selected = await doctorAppointmentsService.startConsultation(id);
      set({ selected, isSaving: false });
    } catch (err) {
      set({ isSaving: false, error: err instanceof Error ? err.message : 'Failed to start consultation' });
      throw err;
    }
  },

  completeConsultation: async (id, summary) => {
    set({ isSaving: true, error: null });
    try {
      const selected = await doctorAppointmentsService.completeConsultation(id, { summary });
      set({ selected, isSaving: false });
    } catch (err) {
      set({ isSaving: false, error: err instanceof Error ? err.message : 'Failed to complete consultation' });
      throw err;
    }
  },

  markNoShow: async (id, reason) => {
    set({ isSaving: true, error: null });
    try {
      const selected = await doctorAppointmentsService.markNoShow(id, { reasonText: reason });
      set({ selected, isSaving: false });
    } catch (err) {
      set({ isSaving: false, error: err instanceof Error ? err.message : 'Failed to mark no-show' });
      throw err;
    }
  },

  requestReschedule: async (id, reason) => {
    set({ isSaving: true, error: null });
    try {
      const selected = await doctorAppointmentsService.requestReschedule(id, { reason });
      set({ selected, isSaving: false });
    } catch (err) {
      set({ isSaving: false, error: err instanceof Error ? err.message : 'Failed to request reschedule' });
      throw err;
    }
  },

  updateClinicalData: async (id, payload) => {
    set({ isSaving: true, error: null });
    try {
      const selected = await doctorAppointmentsService.updateClinicalData(id, payload);
      set({ selected, isSaving: false });
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : 'Failed to update patient data',
      });
      throw err;
    }
  },

  clearSelected: () => set({ selected: null, prescriptionBundle: null, prescriptionPdf: null }),
  clearError: () => set({ error: null }),
}));
