import { create } from 'zustand';
import { patientsService } from '@/services';
import type {
  PatientDashboardData,
  PatientDetail,
  PatientHistory,
  PatientTrendPoint,
  ReportListItem,
  TimelineEvent,
} from '@/types';
import type { PatientAppointmentRecord, PatientVisitRecord } from '@/types/patientProfile';

interface PatientDetailStore {
  detail: PatientDetail | null;
  dashboard: PatientDashboardData | null;
  timeline: TimelineEvent[];
  trends: PatientTrendPoint[];
  history: PatientHistory | null;
  appointments: PatientAppointmentRecord[];
  visits: PatientVisitRecord[];
  reports: ReportListItem[];
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
  dashboard: null,
  timeline: [],
  trends: [],
  history: null,
  appointments: [],
  visits: [],
  reports: [],
  isLoading: false,
  isSaving: false,
  error: null,

  loadPatient: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const [
        detail,
        dashboard,
        timeline,
        trends,
        history,
        appointments,
        visits,
        reports,
      ] = await Promise.all([
        patientsService.getById(id),
        patientsService.getDashboard(id),
        patientsService.getTimeline(id),
        patientsService.getTrends(id),
        patientsService.getHistory(id),
        patientsService.getAppointments(id),
        patientsService.getVisits(id),
        patientsService.getReports(id),
      ]);
      set({
        detail,
        dashboard,
        timeline,
        trends,
        history,
        appointments,
        visits,
        reports,
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
      const timeline = await patientsService.getTimeline(id);
      set({ history, timeline, isSaving: false });
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
      dashboard: null,
      timeline: [],
      trends: [],
      history: null,
      appointments: [],
      visits: [],
      reports: [],
      error: null,
    }),
}));
