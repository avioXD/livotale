import { create } from 'zustand';
import { adminAppointmentsService } from '@/services';
import type {
  AdminAppointmentSummary,
  AdminAppointmentsDashboard,
  AdminRouteLiveItem,
  AppointmentReminderLog,
} from '@/types';

interface AdminAppointmentsStore {
  dashboard: AdminAppointmentsDashboard | null;
  appointments: AdminAppointmentSummary[];
  missed: AdminAppointmentSummary[];
  routeLive: AdminRouteLiveItem[];
  reminderLogs: AppointmentReminderLog[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadDashboard: () => Promise<void>;
  loadAppointments: (params?: Record<string, string | undefined>) => Promise<void>;
  assignStaff: (id: string, payload: { doctorId?: string; technicianId?: string }) => Promise<void>;
  sendReminder: (id: string) => Promise<void>;
  loadMissed: () => Promise<void>;
  handleMissed: (id: string, action: 'follow_up' | 'closed') => Promise<void>;
  loadRouteLive: (date?: string) => Promise<void>;
  loadReminderLogs: () => Promise<void>;
  clearError: () => void;
}

export const useAdminAppointmentsStore = create<AdminAppointmentsStore>((set) => ({
  dashboard: null,
  appointments: [],
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
      const appointments = await adminAppointmentsService.list(params);
      set({ appointments, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load appointments' });
    }
  },

  assignStaff: async (id, payload) => {
    set({ isSaving: true, error: null });
    try {
      await adminAppointmentsService.assign(id, { ...payload, notify: true });
      const dashboard = await adminAppointmentsService.getDashboard();
      const appointments = await adminAppointmentsService.list();
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
      const reminderLogs = await adminAppointmentsService.listReminderLogs();
      set({ reminderLogs, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load reminder logs' });
    }
  },

  clearError: () => set({ error: null }),
}));
