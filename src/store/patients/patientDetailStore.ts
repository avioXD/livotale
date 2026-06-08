import { create } from 'zustand';
import { patientsService } from '@/services';
import type { PatientDetail, PatientHistory } from '@/types';
import type { PatientClinicalContext } from '@/types/patientClinical';

interface PatientDetailStore {
  detail: PatientDetail | null;
  history: PatientHistory | null;
  clinical: PatientClinicalContext | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadPatient: (id: string) => Promise<void>;
  saveDemographics: (id: string, payload: Record<string, unknown>) => Promise<void>;
  saveHistorySection: (id: string, section: string, payload: Record<string, unknown>) => Promise<void>;
  clear: () => void;
}

export const usePatientDetailStore = create<PatientDetailStore>((set) => ({
  detail: null,
  history: null,
  clinical: null,
  isLoading: false,
  isSaving: false,
  error: null,

  loadPatient: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const [detail, history, clinical] = await Promise.all([
        patientsService.getById(id),
        patientsService.getHistory(id),
        patientsService.getClinicalContext(id),
      ]);
      set({
        detail,
        history,
        clinical,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load patient',
      });
    }
  },

  saveDemographics: async (id, payload) => {
    set({ isSaving: true, error: null });
    try {
      const detail = await patientsService.updateDemographics(id, payload);
      set({ detail, isSaving: false });
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : 'Failed to save demographics',
      });
      throw err;
    }
  },

  saveHistorySection: async (id, section, payload) => {
    set({ isSaving: true, error: null });
    try {
      const history = await patientsService.updateHistorySection(id, section, payload);
      set({ history, isSaving: false });
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : 'Failed to save history',
      });
      throw err;
    }
  },

  clear: () =>
    set({
      detail: null,
      history: null,
      clinical: null,
      error: null,
    }),
}));
