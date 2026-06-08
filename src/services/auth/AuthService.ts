import { mockOrApi } from '@/services/mock';
import { authMock } from '@/services/auth/auth.mock';
import { BaseApiService } from '@/services/base';
import type {
  ApiLoginResponse,
  ApiMeResponse,
  AuthResponse,
  ChangePasswordPayload,
  LoginLogEntry,
  LoginPayload,
  OtpRequestPayload,
  OtpVerifyPayload,
  RegisterPayload,
  ResetPasswordPayload,
  User,
  UserSession,
} from '@/types';
import { toAuthResponse, toUserFromMe } from '@/utils/authMappers';
import { setMockSessionUser } from '@/services/mock/mockSession';
import { setStoredTokens } from '@/rbac';

class AuthService extends BaseApiService {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    return mockOrApi(
      () => authMock.login(payload),
      async () => {
        const api = await this.post<ApiLoginResponse>('/auth/login', {
          identifier: payload.identifier.trim(),
          password: payload.password,
        });
        const auth = toAuthResponse(api);
        const profile = await this.getProfileWithToken(
          auth.tokens.accessToken,
          auth.tokens.refreshToken,
        );
        return { ...auth, user: profile };
      },
    );
  }

  async requestOtp(payload: OtpRequestPayload): Promise<{ expiresInSeconds: number; devOtp?: string }> {
    return mockOrApi(
      () => authMock.requestOtp(),
      () => this.post('/auth/otp/request', payload),
    );
  }

  async verifyOtp(payload: OtpVerifyPayload): Promise<AuthResponse> {
    return mockOrApi(
      () => authMock.verifyOtp(payload),
      async () => {
        const api = await this.post<ApiLoginResponse>('/auth/otp/verify', payload);
        const auth = toAuthResponse(api);
        const profile = await this.getProfileWithToken(
          auth.tokens.accessToken,
          auth.tokens.refreshToken,
        );
        return { ...auth, user: profile };
      },
    );
  }

  async refresh(refreshToken: string): Promise<AuthResponse['tokens']> {
    return mockOrApi(
      () => authMock.refresh(refreshToken),
      () => this.post('/auth/refresh', { refreshToken }),
    );
  }

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    return mockOrApi(
      () => authMock.register(payload),
      async () => {
        await this.post('/patient/register', {
          username: payload.username.trim().toLowerCase(),
          password: payload.password,
          fullName: payload.fullName,
          email: payload.email ?? null,
          mobile: payload.mobile ?? null,
        });
        return this.login({
          identifier: payload.username,
          password: payload.password,
        });
      },
    );
  }

  async resetPassword(_payload: ResetPasswordPayload): Promise<{ message: string }> {
    throw new Error('Password reset is not available yet. Contact your administrator.');
  }

  async changePassword(payload: ChangePasswordPayload): Promise<{ updated: boolean }> {
    return mockOrApi(
      () => authMock.changePassword(),
      () => this.post('/auth/password/change', payload),
    );
  }

  async getProfile(): Promise<User> {
    return mockOrApi(
      () => authMock.getProfile(),
      async () => {
        const api = await this.get<ApiMeResponse>('/auth/me');
        const user = toUserFromMe(api);
        setMockSessionUser(user);
        return user;
      },
    );
  }

  async logout(refreshToken?: string): Promise<void> {
    if (import.meta.env.VITE_MOCK_MODE === 'true') {
      authMock.logout();
      return;
    }
    try {
      await this.post('/auth/logout', { refreshToken });
    } catch {
      // Best-effort server logout
    }
  }

  async listSessions(): Promise<UserSession[]> {
    return mockOrApi(
      () => authMock.listSessions(),
      () => this.get('/auth/sessions'),
    );
  }

  async revokeSession(sessionId: string): Promise<{ revoked: boolean }> {
    return mockOrApi(
      () => authMock.revokeSession(),
      () => this.delete(`/auth/sessions/${sessionId}`),
    );
  }

  async getLoginLogs(limit = 20): Promise<LoginLogEntry[]> {
    return mockOrApi(
      () => authMock.getLoginLogs(),
      () => this.get(`/audit/login-logs?limit=${limit}`),
    );
  }

  private async getProfileWithToken(token: string, refreshToken?: string): Promise<User> {
    if (refreshToken) setStoredTokens(token, refreshToken);
    else setStoredTokens(token);

    const response = await this.client.get<{ data: ApiMeResponse }>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const api = response.data.data ?? (response.data as unknown as ApiMeResponse);
    return toUserFromMe(api);
  }
}

export const authService = new AuthService();
