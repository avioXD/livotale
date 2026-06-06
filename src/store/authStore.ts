import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '@/services';
import {
  clearStoredTokens,
  getStoredToken,
  isTokenExpired,
  setStoredTokens,
} from '@/rbac';
import type {
  AppRole,
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  User,
} from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sidebarCollapsed: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => void;
  clearError: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

function applyAuthResponse(
  set: (partial: Partial<AuthState>) => void,
  response: AuthResponse,
) {
  setStoredTokens(response.tokens.accessToken, response.tokens.refreshToken);
  set({
    user: response.user,
    accessToken: response.tokens.accessToken,
    isAuthenticated: true,
    error: null,
  });
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sidebarCollapsed: false,

      login: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(payload);
          applyAuthResponse(set, response);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Login failed';
          set({ error: message, isAuthenticated: false });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.register(payload);
          applyAuthResponse(set, response);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Registration failed';
          set({ error: message });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      resetPassword: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          await authService.resetPassword(payload);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Reset password failed';
          set({ error: message });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch {
          // Clear local session even if API logout fails
        } finally {
          clearStoredTokens();
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      hydrate: () => {
        const token = getStoredToken();
        if (token && !isTokenExpired(token)) {
          set({ accessToken: token, isAuthenticated: true });
        } else {
          clearStoredTokens();
          set({ user: null, accessToken: null, isAuthenticated: false });
        }
      },

      clearError: () => set({ error: null }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'livotel-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);

export function useUserRole(): AppRole | null {
  return useAuthStore((state) => state.user?.role ?? null);
}
