import { BaseApiService } from '@/services/base';
import type {
  ApiLoginLogEntry,
  ApiLoginResponse,
  ApiMeResponse,
  ApiSessionInfo,
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
import { toAuthResponse, toLoginLogEntry, toUserFromMe, toUserSession } from '@/utils/authMappers';
import { setStoredTokens, getStoredRefreshToken } from '@/rbac';

class AuthService extends BaseApiService {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const api = await this.post<ApiLoginResponse>('/auth/login', {
      identifier: payload.identifier.trim(),
      password: payload.password.trim(),
      ...(payload.activeRole ? { activeRole: payload.activeRole } : {}),
    });
    const auth = toAuthResponse(api);
    setStoredTokens(auth.tokens.accessToken, auth.tokens.refreshToken);
    return auth;
  }

  async requestOtp(payload: OtpRequestPayload): Promise<{ expiresInSeconds: number; devOtp?: string }> {
    return this.post('/auth/otp/request', payload);
  }

  async verifyOtp(payload: OtpVerifyPayload): Promise<AuthResponse> {
    const api = await this.post<ApiLoginResponse>('/auth/otp/verify', payload);
    const auth = toAuthResponse(api);
    const profile = await this.getProfileWithToken(
      auth.tokens.accessToken,
      auth.tokens.refreshToken,
    );
    return { ...auth, user: profile };
  }

  async selectRole(activeRole: ApiLoginResponse['user']['roles'][number]): Promise<AuthResponse> {
    const api = await this.post<{
      accessToken: string;
      activeRole: ApiLoginResponse['user']['roles'][number];
      permissions?: string[];
      user: ApiLoginResponse['user'];
    }>('/auth/select-role', { activeRole });
    setStoredTokens(api.accessToken, getStoredRefreshToken() ?? undefined);
    const auth = toAuthResponse({
      accessToken: api.accessToken,
      tokenType: 'Bearer',
      expiresIn: '8h',
      permissions: api.permissions,
      activeRole: api.activeRole,
      requiresRoleSelection: false,
      user: api.user,
    });
    return auth;
  }

  async refresh(
    refreshToken: string,
    activeRole?: ApiLoginResponse['user']['roles'][number],
  ): Promise<AuthResponse['tokens'] & { activeRole?: ApiLoginResponse['user']['roles'][number]; requiresRoleSelection?: boolean }> {
    return this.post('/auth/refresh', {
      refreshToken,
      ...(activeRole ? { activeRole } : {}),
    });
  }

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const api = await this.post<ApiLoginResponse>('/patient/register', {
      username: payload.username.trim().toLowerCase(),
      password: payload.password,
      fullName: payload.fullName,
      email: payload.email ?? null,
      mobile: payload.mobile ?? null,
      ...(payload.role ? { role: payload.role } : {}),
    });
    const auth = toAuthResponse(api);
    setStoredTokens(auth.tokens.accessToken, auth.tokens.refreshToken);
    return auth;
  }

  async resetPassword(_payload: ResetPasswordPayload): Promise<{ message: string }> {
    throw new Error('Password reset is not available yet. Contact your administrator.');
  }

  async changePassword(payload: ChangePasswordPayload): Promise<{ updated: boolean }> {
    return this.post('/auth/password/change', payload);
  }

  async getProfile(): Promise<User> {
    const api = await this.get<ApiMeResponse>('/auth/me');
    return toUserFromMe(api);
  }

  async logout(refreshToken?: string): Promise<void> {
    try {
      await this.post('/auth/logout', { refreshToken });
    } catch {
      // Best-effort server logout
    }
  }

  async listSessions(): Promise<UserSession[]> {
    const rows = await this.get<ApiSessionInfo[]>('/auth/sessions');
    return rows.map(toUserSession);
  }

  async revokeSession(sessionId: string): Promise<{ revoked: boolean }> {
    return this.delete(`/auth/sessions/${sessionId}`);
  }

  async getLoginLogs(limit = 20): Promise<LoginLogEntry[]> {
    const rows = await this.get<ApiLoginLogEntry[]>(`/audit/login-logs?limit=${limit}`);
    return rows.map(toLoginLogEntry);
  }

  async getAllLoginLogs(limit = 50): Promise<LoginLogEntry[]> {
    const rows = await this.get<ApiLoginLogEntry[]>(`/audit/login-logs?all=true&limit=${limit}`);
    return rows.map(toLoginLogEntry);
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
