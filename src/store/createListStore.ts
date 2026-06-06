import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { DEBOUNCE, DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { debounceAsync } from '@/utils/debounce';
import type { ListFetchParams, PaginatedResponse } from '@/types';

export interface ListStoreActions<TFilters extends Record<string, unknown>> {
  fetchItems: () => Promise<void>;
  setSearchInput: (search: string) => void;
  setDraftFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;
  setDraftFilters: (filters: Partial<TFilters>) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  clearError: () => void;
}

export interface ListStoreFullState<TItem, TFilters extends Record<string, unknown>>
  extends ListStoreActions<TFilters> {
  items: TItem[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
  searchInput: string;
  appliedSearch: string;
  draftFilters: TFilters;
  appliedFilters: TFilters;
  isLoading: boolean;
  error: string | null;
}

interface CreateListStoreConfig<TItem, TFilters extends Record<string, unknown>> {
  name: string;
  defaultFilters: TFilters;
  defaultPageSize?: number;
  fetchFn: (params: ListFetchParams<TFilters>) => Promise<PaginatedResponse<TItem>>;
}

export function createListStore<TItem, TFilters extends Record<string, unknown>>(
  config: CreateListStoreConfig<TItem, TFilters>,
): UseBoundStore<StoreApi<ListStoreFullState<TItem, TFilters>>> {
  const { defaultFilters, defaultPageSize = DEFAULT_PAGE_SIZE, fetchFn } = config;

  const debouncedFetch = debounceAsync(async (get: () => ListStoreFullState<TItem, TFilters>, set: (partial: Partial<ListStoreFullState<TItem, TFilters>>) => void) => {
    set({ isLoading: true, error: null });
    const state = get();
    try {
      const response = await fetchFn({
        page: state.page,
        pageSize: state.pageSize,
        search: state.appliedSearch || undefined,
        filters: state.appliedFilters,
      });
      set({
        items: response.data,
        total: response.total,
        totalPages: response.totalPages,
        page: response.page,
        pageSize: response.pageSize,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch data',
      });
    }
  }, DEBOUNCE.paginationMs);

  const debouncedSearchApply = debounceAsync(async (get: () => ListStoreFullState<TItem, TFilters>, set: (partial: Partial<ListStoreFullState<TItem, TFilters>>) => void) => {
    const { searchInput } = get();
    set({ appliedSearch: searchInput, page: 1 });
    await get().fetchItems();
  }, DEBOUNCE.searchMs);

  return create<ListStoreFullState<TItem, TFilters>>((set, get) => ({
    items: [],
    total: 0,
    totalPages: 0,
    page: 1,
    pageSize: defaultPageSize,
    searchInput: '',
    appliedSearch: '',
    draftFilters: { ...defaultFilters },
    appliedFilters: { ...defaultFilters },
    isLoading: false,
    error: null,

    fetchItems: async () => {
      set({ isLoading: true, error: null });
      const state = get();
      try {
        const response = await fetchFn({
          page: state.page,
          pageSize: state.pageSize,
          search: state.appliedSearch || undefined,
          filters: state.appliedFilters,
        });
        set({
          items: response.data,
          total: response.total,
          totalPages: response.totalPages,
          page: response.page,
          pageSize: response.pageSize,
          isLoading: false,
        });
      } catch (err) {
        set({
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to fetch data',
        });
      }
    },

    setSearchInput: (search) => {
      set({ searchInput: search });
      debouncedSearchApply(get, set);
    },

    setDraftFilter: (key, value) => {
      set({ draftFilters: { ...get().draftFilters, [key]: value } });
    },

    setDraftFilters: (filters) => {
      set({ draftFilters: { ...get().draftFilters, ...filters } });
    },

    applyFilters: () => {
      set({
        appliedFilters: { ...get().draftFilters },
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

    setPage: (page) => {
      set({ page });
      debouncedFetch(get, set);
    },

    setPageSize: (pageSize) => {
      set({ pageSize, page: 1 });
      debouncedFetch(get, set);
    },

    clearError: () => set({ error: null }),
  }));
}
