import { create } from 'zustand';
import { reportsService } from '@/services';
import type { ReportDetail, ReportListItem } from '@/types';

interface ReportsStore {
  reports: ReportListItem[];
  selected: ReportDetail | null;
  isLoading: boolean;
  error: string | null;
  loadReports: () => Promise<void>;
  loadDetail: (reportKey: string) => Promise<void>;
  clearSelected: () => void;
}

export const useReportsStore = create<ReportsStore>((set) => ({
  reports: [],
  selected: null,
  isLoading: false,
  error: null,

  loadReports: async () => {
    set({ isLoading: true, error: null });
    try {
      const reports = await reportsService.list();
      set({ reports, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load reports',
      });
    }
  },

  loadDetail: async (reportKey) => {
    set({ isLoading: true, error: null });
    try {
      const selected = await reportsService.getByKey(reportKey);
      set({ selected, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load report',
      });
    }
  },

  clearSelected: () => set({ selected: null }),
}));
