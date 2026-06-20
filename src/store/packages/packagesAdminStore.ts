import { create } from 'zustand';
import { packageService } from '@/services/liverCare';
import type { LiverCarePackage } from '@/types/package';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';
import { sortByLatestFirst } from '@/utils/sortByLatestFirst';

export interface PackagesAdminFilters extends Record<string, unknown> {
  status: '' | 'active' | 'inactive';
}

const DEFAULT_FILTERS: PackagesAdminFilters = { status: '' };

interface PackagesAdminStore {
  packages: LiverCarePackage[];
  searchInput: string;
  appliedSearch: string;
  draftFilters: PackagesAdminFilters;
  appliedFilters: PackagesAdminFilters;
  page: number;
  pageSize: number;
  filtersExpanded: boolean;
  isLoading: boolean;
  error: string | null;
  fetchPackages: () => Promise<void>;
  setSearchInput: (value: string) => void;
  setDraftFilter: <K extends keyof PackagesAdminFilters>(key: K, value: PackagesAdminFilters[K]) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setFiltersExpanded: (expanded: boolean) => void;
  getPaged: () => ReturnType<typeof paginateList<LiverCarePackage>>;
  upsertPackage: (pkg: LiverCarePackage) => void;
  removePackage: (id: string) => void;
  clearError: () => void;
}

export function filterPackages(
  packages: LiverCarePackage[],
  search: string,
  filters: PackagesAdminFilters,
): LiverCarePackage[] {
  let result = packages;
  if (filters.status === 'active') result = result.filter((p) => p.active);
  if (filters.status === 'inactive') result = result.filter((p) => !p.active);
  const q = search.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.subtitle?.toLowerCase().includes(q) ?? false),
    );
  }
  return result;
}

export const usePackagesAdminStore = create<PackagesAdminStore>((set, get) => ({
  packages: [],
  searchInput: '',
  appliedSearch: '',
  draftFilters: { ...DEFAULT_FILTERS },
  appliedFilters: { ...DEFAULT_FILTERS },
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  filtersExpanded: false,
  isLoading: false,
  error: null,

  fetchPackages: async () => {
    set({ isLoading: true, error: null });
    try {
      const packages = sortByLatestFirst(await packageService.listAdmin());
      set({ packages, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load packages',
      });
    }
  },

  setSearchInput: (value) => set({ searchInput: value }),

  setDraftFilter: (key, value) => {
    set({ draftFilters: { ...get().draftFilters, [key]: value } });
  },

  applyFilters: () => {
    set({
      appliedSearch: get().searchInput.trim(),
      appliedFilters: { ...get().draftFilters },
      page: 1,
    });
  },

  resetFilters: () => {
    set({
      searchInput: '',
      appliedSearch: '',
      draftFilters: { ...DEFAULT_FILTERS },
      appliedFilters: { ...DEFAULT_FILTERS },
      page: 1,
    });
  },

  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  setFiltersExpanded: (filtersExpanded) => set({ filtersExpanded }),

  getPaged: () => {
    const { packages, appliedSearch, appliedFilters, page, pageSize } = get();
    const filtered = filterPackages(packages, appliedSearch, appliedFilters);
    const paged = paginateList(filtered, page, pageSize);
    if (paged.page !== page) set({ page: paged.page });
    return paged;
  },

  upsertPackage: (pkg) => {
    const existing = get().packages;
    const idx = existing.findIndex((p) => p.id === pkg.id);
    if (idx < 0) {
      set({ packages: sortByLatestFirst([...existing, pkg]) });
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

export { DEFAULT_FILTERS as DEFAULT_PACKAGES_FILTERS };
