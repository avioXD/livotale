import { create } from 'zustand';
import { packageService } from '@/services/liverCare';
import type { LiverCarePackage } from '@/types/package';

interface PackagesAdminStore {
  packages: LiverCarePackage[];
  searchInput: string;
  isLoading: boolean;
  error: string | null;
  fetchPackages: () => Promise<void>;
  setSearchInput: (value: string) => void;
  upsertPackage: (pkg: LiverCarePackage) => void;
  removePackage: (id: string) => void;
  clearError: () => void;
}

export const usePackagesAdminStore = create<PackagesAdminStore>((set, get) => ({
  packages: [],
  searchInput: '',
  isLoading: false,
  error: null,

  fetchPackages: async () => {
    set({ isLoading: true, error: null });
    try {
      const packages = await packageService.listAdmin();
      set({ packages, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load packages',
      });
    }
  },

  setSearchInput: (value) => set({ searchInput: value }),

  upsertPackage: (pkg) => {
    const existing = get().packages;
    const idx = existing.findIndex((p) => p.id === pkg.id);
    if (idx < 0) {
      set({ packages: [...existing, pkg].sort((a, b) => a.sortOrder - b.sortOrder) });
      return;
    }
    const next = [...existing];
    next[idx] = pkg;
    set({ packages: next });
  },

  removePackage: (id) => {
    set({ packages: get().packages.filter((p) => p.id !== id) });
  },

  clearError: () => set({ error: null }),
}));
