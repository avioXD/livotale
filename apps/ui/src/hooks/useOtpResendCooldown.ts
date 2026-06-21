import { useCallback, useEffect, useState } from 'react';

export interface OtpSendMeta {
  sent?: boolean;
  retryAfterSeconds?: number;
  demoOtp?: string;
}

export function useOtpResendCooldown(defaultSeconds = 0) {
  const [remaining, setRemaining] = useState(defaultSeconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = globalThis.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => globalThis.clearInterval(timer);
  }, [remaining]);

  const startCooldown = useCallback((seconds: number) => {
    setRemaining(Math.max(0, seconds));
  }, []);

  return {
    remaining,
    canResend: remaining <= 0,
    startCooldown,
  };
}

export function applyOtpSendMeta(
  meta: OtpSendMeta | undefined,
  startCooldown: (seconds: number) => void,
): string | undefined {
  if (meta?.retryAfterSeconds) {
    startCooldown(meta.retryAfterSeconds);
  }
  return meta?.demoOtp;
}
