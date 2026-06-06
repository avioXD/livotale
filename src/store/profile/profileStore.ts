import { create } from 'zustand';
import { profileService } from '@/services/profile';
import type { UserConsent, UserProfile } from '@/types';

interface ProfileStoreState {
  profile: UserProfile | null;
  consents: UserConsent[];
  isLoading: boolean;
  error: string | null;
  loadProfile: () => Promise<void>;
  saveBasic: (payload: { fullName?: string; email?: string; mobile?: string }) => Promise<void>;
  saveEmergencyContact: (payload: { name: string; mobile: string }) => Promise<void>;
  loadConsents: () => Promise<void>;
  acceptConsent: (purposeId: string) => Promise<void>;
  clearError: () => void;
}

export const useProfileStore = create<ProfileStoreState>((set) => ({
  profile: null,
  consents: [],
  isLoading: false,
  error: null,

  loadProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await profileService.getProfile();
      set({ profile, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load profile',
      });
    }
  },

  saveBasic: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await profileService.updateBasic(payload);
      set({ profile, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to save profile',
      });
      throw err;
    }
  },

  saveEmergencyContact: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await profileService.updateEmergencyContact(payload);
      set({ profile, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to save emergency contact',
      });
      throw err;
    }
  },

  loadConsents: async () => {
    try {
      const consents = await profileService.listConsents();
      set({ consents });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load consents' });
    }
  },

  acceptConsent: async (purposeId) => {
    const consents = await profileService.acceptConsent(purposeId);
    set({ consents });
  },

  clearError: () => set({ error: null }),
}));
