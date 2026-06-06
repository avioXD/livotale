import { create } from 'zustand';
import { dashboardService, journeyService } from '@/services';
import type { DashboardOverview, PatientDashboardData } from '@/types';

interface DashboardStore {
  overview: DashboardOverview | null;
  patientDashboard: PatientDashboardData | null;
  isLoading: boolean;
  error: string | null;
  loadOverview: () => Promise<void>;
  loadPatientDashboard: () => Promise<void>;
  clear: () => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  overview: null,
  patientDashboard: null,
  isLoading: false,
  error: null,

  loadOverview: async () => {
    set({ isLoading: true, error: null, patientDashboard: null });
    try {
      const overview = await dashboardService.getOverview();
      set({ overview, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load dashboard',
      });
    }
  },

  loadPatientDashboard: async () => {
    set({ isLoading: true, error: null, overview: null });
    try {
      const patientDashboard = await journeyService.getDashboardAnalytics();
      set({ patientDashboard, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load your health dashboard',
      });
    }
  },

  clear: () => set({ overview: null, patientDashboard: null, error: null }),
}));
