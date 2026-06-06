import {
  AppRole,
  type ApiLoginResponse,
  type ApiMeResponse,
  type ApiRoleCode,
  type AuthResponse,
  type User,
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
): User {
  const roles = mapApiRoles(api.roles);
  return {
    id: api.id,
    username: api.username,
    fullName: api.fullName ?? api.full_name ?? '',
    email: api.email ?? null,
    mobile: api.mobile ?? null,
    roles,
    permissions: api.permissions,
    role: pickPrimaryRole(roles),
  };
}

export function toUserFromLogin(api: ApiLoginResponse['user']): User {
  return buildUser(api);
}

export function toUserFromMe(api: ApiMeResponse): User {
  return buildUser({
    id: api.id,
    username: api.username,
    full_name: api.full_name,
    email: api.email,
    mobile: api.mobile,
    roles: api.roles,
    permissions: api.permissions,
  });
}

export function toAuthResponse(api: ApiLoginResponse): AuthResponse {
  return {
    user: toUserFromLogin(api.user),
    tokens: {
      accessToken: api.accessToken,
      refreshToken: api.refreshToken,
    },
    sessionId: api.sessionId,
  };
}

export function hasPermission(user: User | null, permission: string): boolean {
  return Boolean(user?.permissions?.includes(permission));
}
