import type { AppRole, ApiRoleCode } from './auth';

export interface JwtPayload {
  sub: string;
  username?: string;
  roles?: ApiRoleCode[];
  exp: number;
  iat: number;
  iss?: string;
}

export type { AppRole };
