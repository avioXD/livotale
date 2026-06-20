import { create } from 'zustand';
import { consultationOpsService } from '@/services/liverCare';
import type { ConsultationQueueRow } from '@/types/consultationQueue';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';
import { sortByLatestFirst } from '@/utils/sortByLatestFirst';

export interface OpsAppointmentsFilters extends Record<string, unknown> {
  stage: string;
}

export const DEFAULT_OPS_APPOINTMENTS_FILTERS: OpsAppointmentsFilters = {
  stage: '',
};

interface OpsAppointmentsStore {
  items: ConsultationQueueRow[];
  searchInput: string;
  appliedSearch: string;
  draftFilters: OpsAppointmentsFilters;
  appliedFilters: OpsAppointmentsFilters;
  page: number;
  pageSize: number;
  filtersExpanded: boolean;
  isLoading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  initFromUrl: (params: URLSearchParams) => void;
  syncFromUrl: (params: URLSearchParams) => void;
  setSearchInput: (v: string) => void;
  setDraftFilter: <K extends keyof OpsAppointmentsFilters>(key: K, value: OpsAppointmentsFilters[K]) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setFiltersExpanded: (v: boolean) => void;
  getPaged: () => ReturnType<typeof paginateList<ConsultationQueueRow>>;
}

export const useOpsAppointmentsStore = create<OpsAppointmentsStore>((set, get) => ({
  items: [],
  searchInput: '',
  appliedSearch: '',
  draftFilters: { ...DEFAULT_OPS_APPOINTMENTS_FILTERS },
  appliedFilters: { ...DEFAULT_OPS_APPOINTMENTS_FILTERS },
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  filtersExpanded: false,
  isLoading: true,
  error: null,

  initFromUrl: (params) => {
    get().syncFromUrl(params);
  },

  syncFromUrl: (params) => {
    const stage = params.get('stage') ?? '';
    const draft = { stage };
    set({ draftFilters: draft, appliedFilters: draft, page: 1 });
  },

  fetchItems: async () => {
    const { appliedSearch, appliedFilters } = get();
    set({ isLoading: true, error: null });
    try {
      const items = sortByLatestFirst(
        await consultationOpsService.listConsultationQueue({
          search: appliedSearch || undefined,
          stage: appliedFilters.stage || undefined,
        }),
      );
      set({ items, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load appointments',
      });
    }
  },

  setSearchInput: (v) => set({ searchInput: v }),

  setDraftFilter: (key, value) => {
    set({ draftFilters: { ...get().draftFilters, [key]: value } });
  },

  applyFilters: () => {
    set({
      appliedFilters: { ...get().draftFilters },
      appliedSearch: get().searchInput.trim().toLowerCase(),
      page: 1,
    });
    void get().fetchItems();
  },

  resetFilters: () => {
    set({
      draftFilters: { ...DEFAULT_OPS_APPOINTMENTS_FILTERS },
      appliedFilters: { ...DEFAULT_OPS_APPOINTMENTS_FILTERS },
      searchInput: '',
      appliedSearch: '',
      page: 1,
    });
    void get().fetchItems();
  },

  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  setFiltersExpanded: (filtersExpanded) => set({ filtersExpanded }),

  getPaged: () => {
    const { items, page, pageSize } = get();
    const paged = paginateList(items, page, pageSize);
    if (paged.page !== page) set({ page: paged.page });
    return paged;
  },
}));
