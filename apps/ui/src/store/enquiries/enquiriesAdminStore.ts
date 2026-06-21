import { create } from 'zustand';
import { enquiryService } from '@/services/liverCare';
import type { Enquiry, EnquiryStatus } from '@/types/enquiry';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';
import { sortByLatestFirst } from '@/utils/sortByLatestFirst';

interface EnquiriesAdminStore {
  items: Enquiry[];
  searchInput: string;
  appliedSearch: string;
  draftStatus: string;
  appliedStatus: string;
  draftSource: string;
  appliedSource: string;
  page: number;
  pageSize: number;
  filtersExpanded: boolean;
  isLoading: boolean;
  error: string | null;
  fetchEnquiries: () => Promise<void>;
  setSearchInput: (v: string) => void;
  setDraftStatus: (v: string) => void;
  setDraftSource: (v: string) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setFiltersExpanded: (v: boolean) => void;
  upsertEnquiry: (enquiry: Enquiry) => void;
  removeEnquiry: (id: string) => void;
  getPaged: () => ReturnType<typeof paginateList<Enquiry>>;
}

export const useEnquiriesAdminStore = create<EnquiriesAdminStore>((set, get) => ({
  items: [],
  searchInput: '',
  appliedSearch: '',
  draftStatus: '',
  appliedStatus: '',
  draftSource: '',
  appliedSource: '',
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  filtersExpanded: false,
  isLoading: false,
  error: null,

  fetchEnquiries: async () => {
    const { appliedSearch, appliedStatus, appliedSource } = get();
    set({ isLoading: true, error: null });
    try {
      const items = sortByLatestFirst(
        await enquiryService.list({
          search: appliedSearch || undefined,
          status: (appliedStatus as EnquiryStatus) || undefined,
          source: appliedSource || undefined,
        }),
      );
      set({ items, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load enquiries',
      });
    }
  },

  setSearchInput: (v) => set({ searchInput: v }),
  setDraftStatus: (v) => set({ draftStatus: v }),
  setDraftSource: (v) => set({ draftSource: v }),

  applyFilters: () => {
    set({
      appliedSearch: get().searchInput.trim(),
      appliedStatus: get().draftStatus,
      appliedSource: get().draftSource,
      page: 1,
    });
    void get().fetchEnquiries();
  },

  resetFilters: () => {
    set({
      searchInput: '',
      draftStatus: '',
      draftSource: '',
      appliedSearch: '',
      appliedStatus: '',
      appliedSource: '',
      page: 1,
    });
    void get().fetchEnquiries();
  },

  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  setFiltersExpanded: (filtersExpanded) => set({ filtersExpanded }),

  upsertEnquiry: (enquiry) => {
    const items = get().items;
    const idx = items.findIndex((e) => e.id === enquiry.id);
    if (idx < 0) {
      set({ items: [enquiry, ...items] });
      return;
    }
    const next = [...items];
    next[idx] = enquiry;
    set({ items: next });
  },

  removeEnquiry: (id) => {
    set({ items: get().items.filter((e) => e.id !== id) });
  },

  getPaged: () => {
    const { items, page, pageSize } = get();
    const paged = paginateList(items, page, pageSize);
    if (paged.page !== page) set({ page: paged.page });
    return paged;
  },
}));
