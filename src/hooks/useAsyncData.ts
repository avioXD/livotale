import { useCallback, useEffect, useState } from 'react';

export type AsyncDataStatus = 'loading' | 'ready' | 'error';

export interface AsyncDataState<T> {
  data: T | null;
  status: AsyncDataStatus;
  error: string | null;
  retry: () => void;
}

export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[],
): AsyncDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<AsyncDataStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);

    void loader()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to load data');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps array is caller-controlled
  }, [...deps, attempt]);

  return { data, status, error, retry };
}
