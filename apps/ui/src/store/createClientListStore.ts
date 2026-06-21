import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';
import { sortByLatestFirst } from '@/utils/sortByLatestFirst';

export interface ClientListFetchParams<TFilters extends Record<string, unknown>> {
  search?: string;
  filters: TFilters;
}

export interface ClientListStoreActions<TItem, TFilters extends Record<string, unknown>> {
  fetchItems: () => Promise<void>;
  setSearchInput: (search: string) => void;
  setDraftFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;
  setDraftFilters: (filters: Partial<TFilters>) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setFiltersExpanded: (expanded: boolean) => void;
  getPaged: () => ReturnType<typeof paginateList<TItem>>;
  clearError: () => void;
}

export interface ClientListStoreFullState<TItem, TFilters extends Record<string, unknown>>
  extends ClientListStoreActions<TItem, TFilters> {
  items: TItem[];
  searchInput: string;
  appliedSearch: string;
  draftFilters: TFilters;
  appliedFilters: TFilters;
  page: number;
  pageSize: number;
  filtersExpanded: boolean;
  isLoading: boolean;
  error: string | null;
}

interface CreateClientListStoreConfig<TItem, TFilters extends Record<string, unknown>> {
  defaultFilters: TFilters;
  defaultPageSize?: number;
  fetchFn: (params: ClientListFetchParams<TFilters>) => Promise<TItem[]>;
}

export function createClientListStore<TItem, TFilters extends Record<string, unknown>>(
  config: CreateClientListStoreConfig<TItem, TFilters>,
): UseBoundStore<StoreApi<ClientListStoreFullState<TItem, TFilters>>> {
  const { defaultFilters, defaultPageSize = DEFAULT_PAGE_SIZE, fetchFn } = config;

  return create<ClientListStoreFullState<TItem, TFilters>>((set, get) => ({
    items: [],
    searchInput: '',
    appliedSearch: '',
    draftFilters: { ...defaultFilters },
    appliedFilters: { ...defaultFilters },
    page: 1,
    pageSize: defaultPageSize,
    filtersExpanded: false,
    isLoading: false,
    error: null,

    fetchItems: async () => {
      set({ isLoading: true, error: null });
      const { appliedSearch, appliedFilters } = get();
      try {
        const items = sortByLatestFirst(
          await fetchFn({
            search: appliedSearch || undefined,
            filters: appliedFilters,
          }),
        );
        set({ items, isLoading: false });
      } catch (err) {
        set({
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to fetch data',
        });
      }
    },

    setSearchInput: (search) => set({ searchInput: search }),

    setDraftFilter: (key, value) => {
      set({ draftFilters: { ...get().draftFilters, [key]: value } });
    },

    setDraftFilters: (filters) => {
      set({ draftFilters: { ...get().draftFilters, ...filters } });
    },

    applyFilters: () => {
      set({
        appliedFilters: { ...get().draftFilters },
        appliedSearch: get().searchInput.trim(),
        page: 1,
      });
      void get().fetchItems();
    },

    resetFilters: () => {
      set({
        draftFilters: { ...defaultFilters },
        appliedFilters: { ...defaultFilters },
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
      if (paged.page !== page) {
        set({ page: paged.page });
      }
      return paged;
    },

    clearError: () => set({ error: null }),
  }));
}
