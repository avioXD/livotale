import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '@/services';
import {
  clearStoredTokens,
  getStoredRefreshToken,
  getStoredToken,
  isTokenExpired,
  setStoredTokens,
} from '@/rbac';
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  User,
} from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sidebarCollapsed: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
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
    refreshToken: response.tokens.refreshToken ?? null,
    isAuthenticated: true,
    error: null,
  });
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
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
        const refreshToken = getStoredRefreshToken();
        try {
          await authService.logout(refreshToken ?? undefined);
        } catch {
          // Clear local session even if API logout fails
        } finally {
          clearStoredTokens();
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      hydrate: async () => {
        const token = getStoredToken();
        const refreshToken = getStoredRefreshToken();
        if (!token || isTokenExpired(token)) {
          if (refreshToken) {
            try {
              const tokens = await authService.refresh(refreshToken);
              setStoredTokens(tokens.accessToken, tokens.refreshToken);
              const user = await authService.getProfile();
              set({
                user,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken ?? refreshToken,
                isAuthenticated: true,
              });
              return;
            } catch {
              clearStoredTokens();
              set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
              return;
            }
          }
          clearStoredTokens();
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
          return;
        }

        set({ accessToken: token, refreshToken, isAuthenticated: true });
        try {
          const user = await authService.getProfile();
          set({ user, accessToken: token, refreshToken, isAuthenticated: true });
        } catch {
          clearStoredTokens();
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
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
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);

export function useUserRole() {
  return useAuthStore((state) => state.user?.role ?? null);
}
