import { create } from 'zustand';
import { packageService } from '@/services/liverCare';
import type { LiverCarePackage } from '@/types/package';

interface PublicPackagesStore {
  packages: LiverCarePackage[];
  selected: LiverCarePackage | null;
  isLoadingList: boolean;
  isLoadingDetail: boolean;
  error: string | null;
  fetchPublicList: () => Promise<void>;
  fetchByCode: (code: string) => Promise<LiverCarePackage | null>;
  clearSelected: () => void;
  /** Drop cached list/detail so next public page refetches (after admin edits). */
  invalidate: () => void;
  clearError: () => void;
}

export const usePublicPackagesStore = create<PublicPackagesStore>((set, get) => ({
  packages: [],
  selected: null,
  isLoadingList: false,
  isLoadingDetail: false,
  error: null,

  fetchPublicList: async () => {
    set({ isLoadingList: true, error: null });
    try {
      const packages = await packageService.listPublic();
      set({ packages, isLoadingList: false });
    } catch (err) {
      set({
        isLoadingList: false,
        error: err instanceof Error ? err.message : 'Failed to load packages',
      });
    }
  },

  fetchByCode: async (code) => {
    const cached = get().packages.find((p) => p.code === code);
    if (cached?.active && cached.visibilityWeb) {
      set({ selected: cached });
      return cached;
    }

    set({ isLoadingDetail: true, error: null, selected: null });
    try {
      const row = await packageService.getByCode(code);
      if (!row || !row.active || !row.visibilityWeb) {
        set({ isLoadingDetail: false, selected: null });
        return null;
      }
      set({ selected: row, isLoadingDetail: false });
      return row;
    } catch (err) {
      set({
        isLoadingDetail: false,
        error: err instanceof Error ? err.message : 'Failed to load package',
      });
      return null;
    }
  },

  clearSelected: () => set({ selected: null }),

  invalidate: () => set({ packages: [], selected: null }),

  clearError: () => set({ error: null }),
}));
