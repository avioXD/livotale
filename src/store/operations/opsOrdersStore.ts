import { create } from 'zustand';
import { liverCareOrderService, type AssignableTechnician } from '@/services/liverCare';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';
import { sortByLatestFirst } from '@/utils/sortByLatestFirst';

export interface OpsOrdersFilters extends Record<string, unknown> {
  orderStatus: string;
  paymentStatus: string;
  createdBy: string;
  assignedTo: string;
}

export const DEFAULT_OPS_ORDERS_FILTERS: OpsOrdersFilters = {
  orderStatus: '',
  paymentStatus: '',
  createdBy: '',
  assignedTo: '',
};

interface OpsOrdersStore {
  items: LiverCareOrder[];
  technicians: AssignableTechnician[];
  searchInput: string;
  appliedSearch: string;
  draftFilters: OpsOrdersFilters;
  appliedFilters: OpsOrdersFilters;
  page: number;
  pageSize: number;
  filtersExpanded: boolean;
  isLoading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  fetchTechnicians: () => Promise<void>;
  initFromUrl: (params: URLSearchParams) => void;
  syncFromUrl: (params: URLSearchParams) => void;
  setSearchInput: (v: string) => void;
  setDraftFilter: <K extends keyof OpsOrdersFilters>(key: K, value: OpsOrdersFilters[K]) => void;
  applyFilters: () => OpsOrdersFilters;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setFiltersExpanded: (v: boolean) => void;
  getPaged: () => ReturnType<typeof paginateList<LiverCareOrder>>;
}

export const useOpsOrdersStore = create<OpsOrdersStore>((set, get) => ({
  items: [],
  technicians: [],
  searchInput: '',
  appliedSearch: '',
  draftFilters: { ...DEFAULT_OPS_ORDERS_FILTERS },
  appliedFilters: { ...DEFAULT_OPS_ORDERS_FILTERS },
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  filtersExpanded: false,
  isLoading: true,
  error: null,

  fetchTechnicians: async () => {
    try {
      const technicians = await liverCareOrderService.listAssignableTechnicians();
      set({ technicians });
    } catch {
      set({ technicians: [] });
    }
  },

  initFromUrl: (params) => {
    get().syncFromUrl(params);
  },

  syncFromUrl: (params) => {
    const draft: OpsOrdersFilters = {
      orderStatus: params.get('orderStatus') ?? '',
      paymentStatus: params.get('paymentStatus') ?? '',
      createdBy: params.get('createdBy') ?? '',
      assignedTo: params.get('assignedTo') ?? '',
    };
    set({
      draftFilters: draft,
      appliedFilters: draft,
      page: 1,
    });
  },

  fetchItems: async () => {
    const { appliedSearch, appliedFilters } = get();
    set({ isLoading: true, error: null });
    try {
      const items = sortByLatestFirst(
        await liverCareOrderService.list({
          orderStatus: appliedFilters.orderStatus || undefined,
          paymentStatus: appliedFilters.paymentStatus || undefined,
          createdBy: appliedFilters.createdBy || undefined,
          assignedTo: appliedFilters.assignedTo || undefined,
          search: appliedSearch || undefined,
        }),
      );
      set({ items, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load orders',
      });
    }
  },

  setSearchInput: (v) => set({ searchInput: v }),

  setDraftFilter: (key, value) => {
    set({ draftFilters: { ...get().draftFilters, [key]: value } });
  },

  applyFilters: () => {
    const appliedFilters = { ...get().draftFilters };
    set({
      appliedFilters,
      appliedSearch: get().searchInput.trim(),
      page: 1,
    });
    void get().fetchItems();
    return appliedFilters;
  },

  resetFilters: () => {
    set({
      draftFilters: { ...DEFAULT_OPS_ORDERS_FILTERS },
      appliedFilters: { ...DEFAULT_OPS_ORDERS_FILTERS },
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
