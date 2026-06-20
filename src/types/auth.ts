export const AppRole = {
  PATIENT: 'PATIENT',
  TECHNICIAN: 'TECHNICIAN',
  DOCTOR: 'DOCTOR',
  DIETICIAN: 'DIETICIAN',
  HEALTH_COACH: 'HEALTH_COACH',
  PHARMACY: 'PHARMACY',
  LAB_PARTNER: 'LAB_PARTNER',
  OPERATIONS: 'OPERATIONS',
  CITY_MANAGER: 'CITY_MANAGER',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type AppRole = (typeof AppRole)[keyof typeof AppRole];

export interface User {
  id: string;
  username: string;
  email: string | null;
  mobile: string | null;
  fullName: string;
  roles: AppRole[];
  permissions?: string[];
  /** Active role chosen at login (or auto-selected when only one role). */
  role: AppRole;
  /** Raw API role code for the active role — used when refreshing tokens. */
  activeRoleCode?: ApiRoleCode;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
  sessionId?: string;
  requiresRoleSelection?: boolean;
  activeRole?: ApiRoleCode;
}

export interface LoginPayload {
  /** Username, email, or mobile */
  identifier: string;
  password: string;
  activeRole?: ApiRoleCode;
}

export interface OtpRequestPayload {
  mobile: string;
}

export interface OtpVerifyPayload {
  mobile: string;
  otp: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  mobile?: string;
  /** API role code to assign (defaults to patient). */
  role?: ApiRoleCode;
}

export interface ResetPasswordPayload {
  email: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/** Raw API role codes from identity.roles */
export type ApiRoleCode =
  | 'patient'
  | 'doctor'
  | 'technician'
  | 'admin'
  | 'health_coach'
  | 'dietician'
  | 'pharmacy'
  | 'lab_partner'
  | 'support'
  | 'city_manager';

export interface ApiLoginResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: string;
  sessionId?: string;
  permissions?: string[];
  activeRole?: ApiRoleCode;
  requiresRoleSelection?: boolean;
  user: {
    id: string;
    username: string;
    fullName: string;
    email?: string | null;
    mobile?: string | null;
    roles: ApiRoleCode[];
  };
}

export interface ApiMeResponse {
  id: string;
  username: string;
  full_name?: string;
  fullName?: string;
  email: string | null;
  mobile: string | null;
  gender?: string | null;
  dob?: string | null;
  twofa_enabled?: boolean;
  last_login_at?: string | null;
  roles: ApiRoleCode[];
  permissions?: string[];
  activeRole?: ApiRoleCode;
  requiresRoleSelection?: boolean;
}

export interface ApiRegisterResponse {
  user: {
    id: string;
    username: string;
    full_name: string;
    email: string | null;
    mobile: string | null;
  };
  patient: {
    id: string;
    patient_code: string;
  };
}

export interface ApiSessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceLabel: string | null;
  isTrusted: boolean;
  status?: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface UserSession {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  device_label: string | null;
  is_trusted: boolean;
  created_at: string;
  expires_at: string;
}

export interface ApiLoginLogEntry {
  id: string;
  userId?: string | null;
  identifierUsed?: string | null;
  loginMethod: string;
  success: boolean;
  failureReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId?: string | null;
  createdAt: string;
  username?: string | null;
  fullName?: string | null;
}

export interface LoginLogEntry {
  id: string;
  login_method: string;
  success: boolean;
  failure_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  identifier_used?: string | null;
  username?: string | null;
  full_name?: string | null;
}
