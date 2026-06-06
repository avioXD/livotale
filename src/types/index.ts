import type { ComponentType } from 'react';

export const AppRole = {
  PATIENT: 'PATIENT',
  TECHNICIAN: 'TECHNICIAN',
  DOCTOR: 'DOCTOR',
  ADMIN: 'ADMIN',
} as const;

export type AppRole = (typeof AppRole)[keyof typeof AppRole];

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AppRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: AppRole;
}

export interface ResetPasswordPayload {
  email: string;
}

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  roles: AppRole[];
}
  sub: string;
  email: string;
  role: AppRole;
  exp: number;
  iat: number;
}
