import { BaseApiService } from '@/services/base';
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  User,
} from '@/types';

class AuthService extends BaseApiService {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/login', payload);
  }

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/register', payload);
  }

  async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    return this.post<{ message: string }>('/auth/reset-password', payload);
  }

  async getProfile(): Promise<User> {
    return this.get<User>('/auth/me');
  }

  async logout(): Promise<void> {
    await this.post<void>('/auth/logout');
  }
}

export const authService = new AuthService();
