declare const __APP_ENV__: string | undefined;

export function normalizeAppEnv(appEnv?: string): string {
  return appEnv?.trim().toLowerCase() || 'production';
}

export function isDevAppEnv(appEnv?: string): boolean {
  return normalizeAppEnv(appEnv) === 'dev';
}

export function getAppEnv(): string {
  return normalizeAppEnv(typeof __APP_ENV__ === 'undefined' ? undefined : __APP_ENV__);
}

export const APP_ENV = getAppEnv();

export function isDevMode(): boolean {
  return isDevAppEnv(getAppEnv());
}
