import { create } from 'zustand';
import { serviceZoneService } from '@/services/orgScope';
import {
  activeCities,
  evaluatePincode,
  servicedPincodes,
  type PincodeServiceability,
  type ServiceZone,
} from '@/types/serviceZone';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';
import { sortByLatestFirst } from '@/utils/sortByLatestFirst';

export interface ServiceZonesListFilters extends Record<string, unknown> {
  status: '' | 'active' | 'inactive';
}

const DEFAULT_LIST_FILTERS: ServiceZonesListFilters = { status: '' };

interface ServiceZonesStore {
  zones: ServiceZone[];
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  searchInput: string;
  appliedSearch: string;
  draftFilters: ServiceZonesListFilters;
  appliedFilters: ServiceZonesListFilters;
  page: number;
  pageSize: number;
  filtersExpanded: boolean;
  /** Load once for app-wide validation/filtering; pass force to refresh. */
  fetchZones: (force?: boolean) => Promise<void>;
  upsertZone: (zone: ServiceZone) => void;
  removeZone: (id: string) => void;
  validatePincode: (pincode: string) => PincodeServiceability;
  getActiveCities: () => ServiceZone[];
  getServicedPincodes: () => string[];
  setSearchInput: (value: string) => void;
  setDraftFilter: <K extends keyof ServiceZonesListFilters>(key: K, value: ServiceZonesListFilters[K]) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setFiltersExpanded: (expanded: boolean) => void;
  getPaged: () => ReturnType<typeof paginateList<ServiceZone>>;
  clearError: () => void;
}

export function filterZones(
  zones: ServiceZone[],
  search: string,
  filters: ServiceZonesListFilters,
): ServiceZone[] {
  let result = zones;
  if (filters.status === 'active') result = result.filter((z) => z.active);
  if (filters.status === 'inactive') result = result.filter((z) => !z.active);
  const q = search.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (z) =>
        z.city.toLowerCase().includes(q) ||
        z.state.toLowerCase().includes(q) ||
        z.pincodes.some((p) => p.includes(q)),
    );
  }
  return result;
}

export const useServiceZonesStore = create<ServiceZonesStore>((set, get) => ({
  zones: [],
  isLoading: false,
  isLoaded: false,
  error: null,
  searchInput: '',
  appliedSearch: '',
  draftFilters: { ...DEFAULT_LIST_FILTERS },
  appliedFilters: { ...DEFAULT_LIST_FILTERS },
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  filtersExpanded: false,

  fetchZones: async (force = false) => {
    if (!force && (get().isLoaded || get().isLoading)) return;
    set({ isLoading: true, error: null });
    try {
      const zones = sortByLatestFirst(await serviceZoneService.list());
      set({ zones, isLoading: false, isLoaded: true });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load service zones',
      });
    }
  },

  upsertZone: (zone) => {
    const existing = get().zones;
    const idx = existing.findIndex((z) => z.id === zone.id);
    if (idx < 0) {
      set({ zones: sortByLatestFirst([zone, ...existing]) });
      return;
    }
    const next = [...existing];
    next[idx] = zone;
    set({ zones: next });
  },

  removeZone: (id) => set({ zones: get().zones.filter((z) => z.id !== id) }),

  validatePincode: (pincode) => evaluatePincode(get().zones, pincode),

  getActiveCities: () => activeCities(get().zones),

  getServicedPincodes: () => servicedPincodes(get().zones),

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
      draftFilters: { ...DEFAULT_LIST_FILTERS },
      appliedFilters: { ...DEFAULT_LIST_FILTERS },
      page: 1,
    });
  },

  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  setFiltersExpanded: (filtersExpanded) => set({ filtersExpanded }),

  getPaged: () => {
    const { zones, appliedSearch, appliedFilters, page, pageSize } = get();
    const filtered = filterZones(zones, appliedSearch, appliedFilters);
    const paged = paginateList(filtered, page, pageSize);
    if (paged.page !== page) set({ page: paged.page });
    return paged;
  },

  clearError: () => set({ error: null }),
}));

export { DEFAULT_LIST_FILTERS as DEFAULT_SERVICE_ZONES_FILTERS };
