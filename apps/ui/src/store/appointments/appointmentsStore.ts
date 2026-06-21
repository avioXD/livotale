import { create } from 'zustand';
import { appointmentsService } from '@/services';
import type {
  AppointmentDetail,
  AppointmentSummary,
  AppointmentTypeOption,
  AppointmentVisitMode,
  BookAppointmentPayload,
  CancelAppointmentPayload,
  DoctorOption,
  RescheduleAppointmentPayload,
  TimeSlotOption,
} from '@/types';

interface AppointmentsStore {
  appointments: AppointmentSummary[];
  types: AppointmentTypeOption[];
  doctors: DoctorOption[];
  selected: AppointmentDetail | null;
  slots: TimeSlotOption[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadAppointments: (asStaff?: boolean) => Promise<void>;
  loadTypes: () => Promise<void>;
  loadDoctors: () => Promise<void>;
  loadDetail: (id: string) => Promise<void>;
  loadSlots: (
    date: string,
    params?: { typeCode?: string; visitMode?: AppointmentVisitMode },
  ) => Promise<void>;
  loadDoctorSlots: (
    doctorId: string,
    date: string,
    visitMode: AppointmentVisitMode,
  ) => Promise<void>;
  book: (payload: BookAppointmentPayload) => Promise<AppointmentSummary>;
  reschedule: (id: string, payload: RescheduleAppointmentPayload) => Promise<void>;
  cancel: (id: string, payload?: CancelAppointmentPayload) => Promise<void>;
  clearSelected: () => void;
  clearError: () => void;
}

export const useAppointmentsStore = create<AppointmentsStore>((set) => ({
  appointments: [],
  types: [],
  doctors: [],
  selected: null,
  slots: [],
  isLoading: false,
  isSaving: false,
  error: null,

  loadAppointments: async (asStaff = false) => {
    set({ isLoading: true, error: null });
    try {
      const appointments = asStaff
        ? await appointmentsService.listStaff()
        : await appointmentsService.listMine();
      set({ appointments, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load appointments',
      });
    }
  },

  loadTypes: async () => {
    try {
      const types = await appointmentsService.listTypes();
      set({ types });
    } catch {
      set({ types: [] });
    }
  },

  loadDoctors: async () => {
    try {
      const doctors = await appointmentsService.listDoctors();
      set({ doctors });
    } catch {
      set({ doctors: [] });
    }
  },

  loadDetail: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const selected = await appointmentsService.getById(id);
      set({ selected, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load appointment',
      });
    }
  },

  loadSlots: async (date, params) => {
    try {
      const slots = await appointmentsService.getSlots(date, params);
      set({ slots });
    } catch {
      set({ slots: [] });
    }
  },

  loadDoctorSlots: async (doctorId, date, visitMode) => {
    try {
      const slots = await appointmentsService.listDoctorSlots(doctorId, date, visitMode);
      set({ slots });
    } catch {
      set({ slots: [] });
    }
  },

  book: async (payload) => {
    set({ isSaving: true, error: null });
    try {
      const created = await appointmentsService.book(payload);
      set((s) => ({
        appointments: [created, ...s.appointments],
        isSaving: false,
      }));
      return created;
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : 'Failed to book appointment',
      });
      throw err;
    }
  },

  reschedule: async (id, payload) => {
    set({ isSaving: true, error: null });
    try {
      const updated = await appointmentsService.reschedule(id, payload);
      set((s) => ({
        appointments: s.appointments.map((a) => (a.id === id ? updated : a)),
        selected: s.selected?.id === id ? { ...s.selected, ...updated } : s.selected,
        isSaving: false,
      }));
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : 'Failed to reschedule',
      });
      throw err;
    }
  },

  cancel: async (id, payload) => {
    set({ isSaving: true, error: null });
    try {
      const updated = await appointmentsService.cancel(id, payload);
      set((s) => ({
        appointments: s.appointments.map((a) => (a.id === id ? updated : a)),
        selected: s.selected?.id === id ? { ...s.selected, ...updated } : s.selected,
        isSaving: false,
      }));
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : 'Failed to cancel appointment',
      });
      throw err;
    }
  },

  clearSelected: () => set({ selected: null }),
  clearError: () => set({ error: null }),
}));
