import { create } from 'zustand';
import { adminAppointmentsService } from '@/services';
import type {
  AdminAppointmentDetail,
  AdminAppointmentSummary,
  AdminAppointmentsDashboard,
  AdminRouteLiveItem,
  AppointmentReminderLog,
} from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';
import { sortByLatestFirst } from '@/utils/sortByLatestFirst';

export interface AdminAppointmentsListFilters extends Record<string, unknown> {
  status: string;
}

const DEFAULT_APPOINTMENTS_FILTERS: AdminAppointmentsListFilters = { status: '' };

interface AdminAppointmentsStore {
  dashboard: AdminAppointmentsDashboard | null;
  appointments: AdminAppointmentSummary[];
  searchInput: string;
  appliedSearch: string;
  draftFilters: AdminAppointmentsListFilters;
  appliedFilters: AdminAppointmentsListFilters;
  page: number;
  pageSize: number;
  filtersExpanded: boolean;
  reminderLogsPage: number;
  reminderLogsPageSize: number;
  selected: AdminAppointmentDetail | null;
  missed: AdminAppointmentSummary[];
  routeLive: AdminRouteLiveItem[];
  reminderLogs: AppointmentReminderLog[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadDashboard: () => Promise<void>;
  loadAppointments: (params?: Record<string, string | undefined>) => Promise<void>;
  loadDetail: (id: string) => Promise<void>;
  updateAppointment: (id: string, payload: Record<string, unknown>) => Promise<void>;
  cancelAppointment: (id: string, reason?: string) => Promise<void>;
  assignStaff: (id: string, payload: { doctorId?: string; technicianId?: string }) => Promise<void>;
  sendReminder: (id: string) => Promise<void>;
  loadMissed: () => Promise<void>;
  handleMissed: (id: string, action: 'follow_up' | 'closed') => Promise<void>;
  loadRouteLive: (date?: string) => Promise<void>;
  loadReminderLogs: () => Promise<void>;
  setSearchInput: (value: string) => void;
  setDraftFilter: <K extends keyof AdminAppointmentsListFilters>(
    key: K,
    value: AdminAppointmentsListFilters[K],
  ) => void;
  applyFilters: () => Promise<void>;
  resetFilters: () => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setFiltersExpanded: (expanded: boolean) => void;
  getPagedAppointments: () => ReturnType<typeof paginateList<AdminAppointmentSummary>>;
  setReminderLogsPage: (page: number) => void;
  setReminderLogsPageSize: (pageSize: number) => void;
  getPagedReminderLogs: () => ReturnType<typeof paginateList<AppointmentReminderLog>>;
  clearSelected: () => void;
  clearError: () => void;
}

export function filterAppointments(
  appointments: AdminAppointmentSummary[],
  search: string,
  filters: AdminAppointmentsListFilters,
): AdminAppointmentSummary[] {
  let result = appointments;
  if (filters.status) {
    result = result.filter((row) => row.status === filters.status);
  }
  const q = search.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (row) =>
        row.appointmentCode.toLowerCase().includes(q) ||
        row.patientName.toLowerCase().includes(q) ||
        row.typeName.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q),
    );
  }
  return sortByLatestFirst(result);
}

export const useAdminAppointmentsStore = create<AdminAppointmentsStore>((set, get) => ({
  dashboard: null,
  appointments: [],
  searchInput: '',
  appliedSearch: '',
  draftFilters: { ...DEFAULT_APPOINTMENTS_FILTERS },
  appliedFilters: { ...DEFAULT_APPOINTMENTS_FILTERS },
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  filtersExpanded: false,
  reminderLogsPage: 1,
  reminderLogsPageSize: DEFAULT_PAGE_SIZE,
  selected: null,
  missed: [],
  routeLive: [],
  reminderLogs: [],
  isLoading: false,
  isSaving: false,
  error: null,

  loadDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const dashboard = await adminAppointmentsService.getDashboard();
      set({ dashboard, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load dashboard' });
    }
  },

  loadAppointments: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const appointments = sortByLatestFirst(await adminAppointmentsService.list(params));
      set({ appointments, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load appointments' });
    }
  },

  loadDetail: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const selected = await adminAppointmentsService.getById(id);
      set({ selected, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load appointment' });
    }
  },

  updateAppointment: async (id, payload) => {
    set({ isSaving: true, error: null });
    try {
      const selected = await adminAppointmentsService.update(id, payload);
      const appointments = sortByLatestFirst(await adminAppointmentsService.list());
      set({ selected, appointments, isSaving: false });
    } catch (err) {
      set({ isSaving: false, error: err instanceof Error ? err.message : 'Failed to update appointment' });
      throw err;
    }
  },

  cancelAppointment: async (id, reason) => {
    set({ isSaving: true, error: null });
    try {
      await adminAppointmentsService.cancelAppointment(id, { reason: reason ?? 'cancelled_by_admin' });
      const appointments = sortByLatestFirst(await adminAppointmentsService.list());
      set({ selected: null, appointments, isSaving: false });
    } catch (err) {
      set({ isSaving: false, error: err instanceof Error ? err.message : 'Failed to cancel appointment' });
      throw err;
    }
  },

  assignStaff: async (id, payload) => {
    set({ isSaving: true, error: null });
    try {
      await adminAppointmentsService.assign(id, { ...payload, notify: true });
      const dashboard = await adminAppointmentsService.getDashboard();
      const appointments = sortByLatestFirst(await adminAppointmentsService.list());
      set({ dashboard, appointments, isSaving: false });
    } catch (err) {
      set({ isSaving: false, error: err instanceof Error ? err.message : 'Failed to assign staff' });
      throw err;
    }
  },

  sendReminder: async (id) => {
    set({ isSaving: true, error: null });
    try {
      await adminAppointmentsService.sendReminder(id);
      set({ isSaving: false });
    } catch (err) {
      set({ isSaving: false, error: err instanceof Error ? err.message : 'Failed to send reminder' });
      throw err;
    }
  },

  loadMissed: async () => {
    set({ isLoading: true, error: null });
    try {
      const missed = await adminAppointmentsService.listMissed();
      set({ missed, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load missed appointments' });
    }
  },

  handleMissed: async (id, action) => {
    set({ isSaving: true, error: null });
    try {
      await adminAppointmentsService.handleMissed(id, { action, reason: `admin_${action}` });
      const missed = await adminAppointmentsService.listMissed();
      set({ missed, isSaving: false });
    } catch (err) {
      set({ isSaving: false, error: err instanceof Error ? err.message : 'Failed to update missed appointment' });
      throw err;
    }
  },

  loadRouteLive: async (date) => {
    set({ isLoading: true, error: null });
    try {
      const routeLive = await adminAppointmentsService.getRouteLive(date);
      set({ routeLive, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load live routes' });
    }
  },

  loadReminderLogs: async () => {
    set({ isLoading: true, error: null });
    try {
      const reminderLogs = sortByLatestFirst(await adminAppointmentsService.listReminderLogs());
      set({ reminderLogs, reminderLogsPage: 1, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load reminder logs' });
    }
  },

  setSearchInput: (value) => set({ searchInput: value }),

  setDraftFilter: (key, value) => {
    set({ draftFilters: { ...get().draftFilters, [key]: value } });
  },

  applyFilters: async () => {
    const appliedFilters = { ...get().draftFilters };
    const appliedSearch = get().searchInput.trim();
    set({ appliedFilters, appliedSearch, page: 1 });
    await get().loadAppointments(
      appliedFilters.status ? { status: appliedFilters.status } : {},
    );
  },

  resetFilters: async () => {
    set({
      searchInput: '',
      appliedSearch: '',
      draftFilters: { ...DEFAULT_APPOINTMENTS_FILTERS },
      appliedFilters: { ...DEFAULT_APPOINTMENTS_FILTERS },
      page: 1,
    });
    await get().loadAppointments();
  },

  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  setFiltersExpanded: (filtersExpanded) => set({ filtersExpanded }),

  getPagedAppointments: () => {
    const { appointments, appliedSearch, appliedFilters, page, pageSize } = get();
    const filtered = filterAppointments(appointments, appliedSearch, appliedFilters);
    const paged = paginateList(filtered, page, pageSize);
    if (paged.page !== page) set({ page: paged.page });
    return paged;
  },

  setReminderLogsPage: (page) => set({ reminderLogsPage: page }),
  setReminderLogsPageSize: (pageSize) => set({ reminderLogsPageSize: pageSize, reminderLogsPage: 1 }),

  getPagedReminderLogs: () => {
    const { reminderLogs, reminderLogsPage, reminderLogsPageSize } = get();
    const paged = paginateList(reminderLogs, reminderLogsPage, reminderLogsPageSize);
    if (paged.page !== reminderLogsPage) set({ reminderLogsPage: paged.page });
    return paged;
  },

  clearSelected: () => set({ selected: null }),
  clearError: () => set({ error: null }),
}));

export { DEFAULT_APPOINTMENTS_FILTERS };
