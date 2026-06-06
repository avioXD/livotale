import { create } from 'zustand';
import { careAppointmentsService } from '@/services';
import type { CareAppointmentDetail, CareAppointmentSummary } from '@/types';

interface CareAppointmentsStore {
  sessions: CareAppointmentSummary[];
  selected: CareAppointmentDetail | null;
  filter: 'upcoming' | 'today' | 'completed';
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadSessions: (filter?: 'upcoming' | 'today' | 'completed') => Promise<void>;
  loadDetail: (id: string) => Promise<void>;
  addNote: (id: string, note: string, visibleToPatient?: boolean) => Promise<void>;
  recommendFollowUp: (id: string, reason: string) => Promise<void>;
  clearSelected: () => void;
}

export const useCareAppointmentsStore = create<CareAppointmentsStore>((set, get) => ({
  sessions: [],
  selected: null,
  filter: 'upcoming',
  isLoading: false,
  isSaving: false,
  error: null,

  loadSessions: async (filter = get().filter) => {
    set({ isLoading: true, error: null, filter });
    try {
      const sessions = await careAppointmentsService.list(filter);
      set({ sessions, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load sessions' });
    }
  },

  loadDetail: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const selected = await careAppointmentsService.getById(id);
      set({ selected, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load session' });
    }
  },

  addNote: async (id, note, visibleToPatient = false) => {
    set({ isSaving: true, error: null });
    try {
      await careAppointmentsService.addNote(id, { note, visibleToPatient });
      const selected = await careAppointmentsService.getById(id);
      set({ selected, isSaving: false });
    } catch (err) {
      set({ isSaving: false, error: err instanceof Error ? err.message : 'Failed to save note' });
      throw err;
    }
  },

  recommendFollowUp: async (id, reason) => {
    set({ isSaving: true, error: null });
    try {
      const selected = await careAppointmentsService.recommendFollowUp(id, { reason, followUpDays: 14 });
      set({ selected, isSaving: false });
    } catch (err) {
      set({ isSaving: false, error: err instanceof Error ? err.message : 'Failed to recommend follow-up' });
      throw err;
    }
  },

  clearSelected: () => set({ selected: null }),
}));
