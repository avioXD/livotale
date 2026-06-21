import { create } from 'zustand';
import { staffOnboardingService } from '@/services/staff/StaffOnboardingService';
import type { StaffOnboardingStatus } from '@/types/staffOnboarding';

interface StaffOnboardingStore {
  status: StaffOnboardingStatus | null;
  loaded: boolean;
  isLoading: boolean;
  error: string | null;
  loadStatus: (userId?: string) => Promise<void>;
  clear: () => void;
}

export const useStaffOnboardingStore = create<StaffOnboardingStore>((set) => ({
  status: null,
  loaded: false,
  isLoading: false,
  error: null,

  loadStatus: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const status = await staffOnboardingService.getStatus(userId);
      set({ status, loaded: true, isLoading: false });
    } catch (err) {
      set({
        loaded: true,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load onboarding status',
        status: {
          required: false,
          profileComplete: true,
          verificationComplete: true,
          employmentStatus: 'active',
          canAccessApp: true,
        },
      });
    }
  },

  clear: () => set({ status: null, loaded: false, error: null }),
}));
