import {
  AppRole,
  type ApiLoginLogEntry,
  type ApiLoginResponse,
  type ApiMeResponse,
  type ApiRoleCode,
  type ApiSessionInfo,
  type AuthResponse,
  type LoginLogEntry,
  type User,
  type UserSession,
} from '@/types';

const API_ROLE_MAP: Record<ApiRoleCode, AppRole> = {
  patient: AppRole.PATIENT,
  doctor: AppRole.DOCTOR,
  technician: AppRole.TECHNICIAN,
  admin: AppRole.SUPER_ADMIN,
  health_coach: AppRole.HEALTH_COACH,
  dietician: AppRole.DIETICIAN,
  pharmacy: AppRole.PHARMACY,
  lab_partner: AppRole.LAB_PARTNER,
  support: AppRole.OPERATIONS,
  city_manager: AppRole.CITY_MANAGER,
};

export const APP_TO_API_ROLE: Record<AppRole, ApiRoleCode> = {
  [AppRole.PATIENT]: 'patient',
  [AppRole.DOCTOR]: 'doctor',
  [AppRole.TECHNICIAN]: 'technician',
  [AppRole.SUPER_ADMIN]: 'admin',
  [AppRole.HEALTH_COACH]: 'health_coach',
  [AppRole.DIETICIAN]: 'dietician',
  [AppRole.PHARMACY]: 'pharmacy',
  [AppRole.LAB_PARTNER]: 'lab_partner',
  [AppRole.OPERATIONS]: 'support',
  [AppRole.CITY_MANAGER]: 'city_manager',
};

/** Prefer elevated ops/clinical roles when a user has multiple assignments. */
const ROLE_PRIORITY: AppRole[] = [
  AppRole.SUPER_ADMIN,
  AppRole.CITY_MANAGER,
  AppRole.OPERATIONS,
  AppRole.DOCTOR,
  AppRole.PHARMACY,
  AppRole.LAB_PARTNER,
  AppRole.TECHNICIAN,
  AppRole.HEALTH_COACH,
  AppRole.DIETICIAN,
  AppRole.PATIENT,
];

export function mapApiRoleCode(code: ApiRoleCode): AppRole {
  return API_ROLE_MAP[code] ?? AppRole.PATIENT;
}

export function mapApiRoles(codes: ApiRoleCode[]): AppRole[] {
  const mapped = codes.map(mapApiRoleCode);
  return [...new Set(mapped)];
}

export function pickPrimaryRole(roles: AppRole[]): AppRole {
  for (const candidate of ROLE_PRIORITY) {
    if (roles.includes(candidate)) return candidate;
  }
  return roles[0] ?? AppRole.PATIENT;
}

export function resolveActiveRole(
  roles: AppRole[],
  activeRoleCode?: ApiRoleCode | null,
): { role: AppRole; activeRoleCode?: ApiRoleCode } {
  if (activeRoleCode) {
    const mapped = mapApiRoleCode(activeRoleCode);
    if (roles.includes(mapped)) {
      return { role: mapped, activeRoleCode };
    }
  }
  const role = pickPrimaryRole(roles);
  return { role, activeRoleCode: APP_TO_API_ROLE[role] };
}

function buildUser(
  api: {
    id: string;
    username: string;
    fullName?: string;
    full_name?: string;
    email?: string | null;
    mobile?: string | null;
    roles: ApiRoleCode[];
    permissions?: string[];
  },
  activeRoleCode?: ApiRoleCode | null,
  options?: { pendingRoleSelection?: boolean },
): User {
  const roles = mapApiRoles(api.roles);
  if (options?.pendingRoleSelection) {
    return {
      id: api.id,
      username: api.username,
      fullName: api.fullName ?? api.full_name ?? '',
      email: api.email ?? null,
      mobile: api.mobile ?? null,
      roles,
      permissions: api.permissions,
      role: roles[0] ?? AppRole.PATIENT,
    };
  }
  const { role, activeRoleCode: resolvedCode } = resolveActiveRole(roles, activeRoleCode);
  return {
    id: api.id,
    username: api.username,
    fullName: api.fullName ?? api.full_name ?? '',
    email: api.email ?? null,
    mobile: api.mobile ?? null,
    roles,
    permissions: api.permissions,
    role,
    activeRoleCode: resolvedCode,
  };
}

export function toUserFromLogin(
  api: ApiLoginResponse['user'],
  activeRoleCode?: ApiRoleCode | null,
): User {
  return buildUser(api, activeRoleCode);
}

export function toUserFromMe(api: ApiMeResponse): User {
  return buildUser(
    {
      id: api.id,
      username: api.username,
      full_name: api.full_name ?? api.fullName,
      fullName: api.fullName ?? api.full_name,
      email: api.email,
      mobile: api.mobile,
      roles: api.roles,
      permissions: api.permissions,
    },
    api.activeRole,
  );
}

export function toAuthResponse(api: ApiLoginResponse): AuthResponse {
  const pendingRoleSelection = Boolean(api.requiresRoleSelection);
  const user = buildUser(api.user, api.activeRole, { pendingRoleSelection });
  if (api.permissions?.length) {
    user.permissions = api.permissions;
  }
  return {
    user,
    tokens: {
      accessToken: api.accessToken,
      refreshToken: api.refreshToken,
    },
    sessionId: api.sessionId,
    requiresRoleSelection: pendingRoleSelection,
    activeRole: api.activeRole,
  };
}

export function hasPermission(user: User | null, permission: string): boolean {
  return Boolean(user?.permissions?.includes(permission));
}

export function toUserSession(api: ApiSessionInfo): UserSession {
  return {
    id: api.id,
    ip_address: api.ipAddress,
    user_agent: api.userAgent,
    device_label: api.deviceLabel,
    is_trusted: api.isTrusted,
    created_at: api.createdAt,
    expires_at: api.expiresAt,
  };
}

export function toLoginLogEntry(api: ApiLoginLogEntry): LoginLogEntry {
  return {
    id: api.id,
    login_method: api.loginMethod,
    success: api.success,
    failure_reason: api.failureReason,
    ip_address: api.ipAddress,
    user_agent: api.userAgent,
    created_at: api.createdAt,
    identifier_used: api.identifierUsed ?? null,
    username: api.username ?? null,
    full_name: api.fullName ?? null,
  };
}

const FAILURE_REASON_LABELS: Record<string, string> = {
  invalid_credentials: 'Invalid credentials',
  invalid_password: 'Invalid password',
  account_locked: 'Account locked',
  account_lockout_triggered: 'Account locked (too many attempts)',
  portal_denied: 'Portal access denied',
};

export function formatLoginFailureReason(reason: string | null | undefined): string | null {
  if (!reason) return null;
  return FAILURE_REASON_LABELS[reason] ?? reason.replace(/_/g, ' ');
}

export function formatLoginMethod(method: string): string {
  if (!method) return 'Unknown';
  return method.charAt(0).toUpperCase() + method.slice(1);
}
