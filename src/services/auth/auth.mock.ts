import { decodeJwt, getStoredToken } from '@/rbac';
import { getMockSessionUser, setMockSessionUser } from '@/services/mock/mockSession';
import {
  type ApiMeResponse,
  type ApiRoleCode,
  type AuthResponse,
  type LoginLogEntry,
  type LoginPayload,
  type RegisterPayload,
  type User,
  type UserSession,
} from '@/types';
import { toUserFromMe } from '@/utils/authMappers';

interface MockAccount {
  password: string;
  me: ApiMeResponse;
}

export const MOCK_SEED_PATIENT_ID = '00000000-0000-4000-8000-000000000201';

/** Staff-only mock logins — single source of truth for dev quick login UI. */
export const MOCK_DEV_USERS = [
  {
    label: 'Administration',
    username: 'administration',
    password: 'Admin@123',
  },
  {
    label: 'Operations',
    username: 'operations',
    password: 'Ops@123',
  },
  {
    label: 'Technician',
    username: 'technician',
    password: 'Tech@123',
  },
  {
    label: 'Doctor',
    username: 'doctor',
    password: 'Doctor@123',
  },
] as const;

const MOCK_ACCOUNTS: Record<string, MockAccount> = {
  administration: {
    password: 'Admin@123',
    me: {
      id: '00000000-0000-4000-8000-000000000108',
      username: 'administration',
      full_name: 'Clinic Administrator',
      email: 'admin@livotale.test',
      mobile: '+919900000010',
      roles: ['admin'],
    },
  },
  operations: {
    password: 'Ops@123',
    me: {
      id: '00000000-0000-4000-8000-000000000106',
      username: 'operations',
      full_name: 'Operations Desk',
      email: 'operations@livotale.test',
      mobile: '+919900000006',
      roles: ['support'],
    },
  },
  technician: {
    password: 'Tech@123',
    me: {
      id: '00000000-0000-4000-8000-000000000103',
      username: 'technician',
      full_name: 'Vinod K.',
      email: 'technician@livotale.test',
      mobile: '+919900000003',
      roles: ['technician'],
    },
  },
  doctor: {
    password: 'Doctor@123',
    me: {
      id: '00000000-0000-4000-8000-000000000102',
      username: 'doctor',
      full_name: 'Dr. Anuradha Iyer',
      email: 'doctor@livotale.test',
      mobile: '+919900000002',
      roles: ['doctor'],
    },
  },
};

function encodeJwtPart(value: object): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value))));
}

export function createMockAccessToken(roles: ApiRoleCode[], userId: string): string {
  const header = encodeJwtPart({ alg: 'none', typ: 'JWT' });
  const payload = encodeJwtPart({
    sub: userId,
    roles,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
  });
  return `${header}.${payload}.mock-signature`;
}

function findAccount(identifier: string): MockAccount | undefined {
  const key = identifier.trim().toLowerCase();
  return (
    MOCK_ACCOUNTS[key]
    ?? Object.values(MOCK_ACCOUNTS).find(
      (a) => a.me.email?.toLowerCase() === key || a.me.mobile === key,
    )
  );
}

function toAuthFromMe(me: ApiMeResponse): AuthResponse {
  const user = toUserFromMe(me);
  setMockSessionUser(user);
  return {
    user,
    tokens: {
      accessToken: createMockAccessToken(me.roles, me.id),
      refreshToken: `refresh-${me.id}`,
    },
    sessionId: `mock-session-${me.id}`,
  };
}

function resolveSessionUser(): User {
  const cached = getMockSessionUser();
  if (cached) return cached;

  const token = getStoredToken();
  if (token) {
    const payload = decodeJwt(token);
    const account = Object.values(MOCK_ACCOUNTS).find((a) => a.me.id === payload?.sub);
    if (account) {
      const user = toUserFromMe(account.me);
      setMockSessionUser(user);
      return user;
    }
  }

  throw new Error('Not authenticated');
}

export const authMock = {
  login(payload: LoginPayload): AuthResponse {
    const account = findAccount(payload.identifier);
    if (!account || account.password !== payload.password) {
      throw new Error('Invalid username or password');
    }
    return toAuthFromMe(account.me);
  },

  register(_payload: RegisterPayload): AuthResponse {
    throw new Error('Patient self-registration is disabled. Contact operations to register.');
  },

  getProfile(): User {
    return resolveSessionUser();
  },

  refresh(refreshToken: string): AuthResponse['tokens'] {
    const me = Object.values(MOCK_ACCOUNTS).find((a) => `refresh-${a.me.id}` === refreshToken)?.me;
    if (!me) throw new Error('Invalid refresh token');
    return {
      accessToken: createMockAccessToken(me.roles, me.id),
      refreshToken,
    };
  },

  logout(): void {
    setMockSessionUser(null);
  },

  requestOtp(): { expiresInSeconds: number; devOtp: string } {
    return { expiresInSeconds: 300, devOtp: '123456' };
  },

  verifyOtp(payload: { mobile: string }): AuthResponse {
    const account = Object.values(MOCK_ACCOUNTS).find((a) => a.me.mobile === payload.mobile);
    if (!account) throw new Error('Mobile not registered');
    return toAuthFromMe(account.me);
  },

  changePassword(): { updated: boolean } {
    return { updated: true };
  },

  listSessions(): UserSession[] {
    return [
      {
        id: 'mock-session-1',
        ip_address: '127.0.0.1',
        user_agent: 'Mock Browser',
        device_label: 'This device',
        is_trusted: true,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
    ];
  },

  revokeSession(): { revoked: boolean } {
    return { revoked: true };
  },

  getLoginLogs(): LoginLogEntry[] {
    return [
      {
        id: 'log-1',
        login_method: 'password',
        success: true,
        failure_reason: null,
        ip_address: '127.0.0.1',
        user_agent: 'Mock',
        created_at: new Date().toISOString(),
      },
    ];
  },
};
