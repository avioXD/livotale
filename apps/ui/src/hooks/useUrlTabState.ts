import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export type UseUrlTabStateOptions<T extends string> = {
  /** Query param name — defaults to `tab`. Also used: `section`, `mode`, `profileSection`. */
  param?: string;
  defaultValue: T;
  validValues: readonly T[];
  /** When true, remove param from URL when value equals defaultValue (hub pages). */
  omitDefault?: boolean;
};

export function useUrlTabState<T extends string>({
  param = 'tab',
  defaultValue,
  validValues,
  omitDefault = false,
}: UseUrlTabStateOptions<T>): [T, (next: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = useMemo(() => {
    const raw = searchParams.get(param);
    if (raw != null && (validValues as readonly string[]).includes(raw)) {
      return raw as T;
    }
    return defaultValue;
  }, [searchParams, param, defaultValue, validValues]);

  const setTab = useCallback(
    (next: string) => {
      if (!(validValues as readonly string[]).includes(next)) return;
      const params = new URLSearchParams(searchParams);
      if (omitDefault && next === defaultValue) {
        params.delete(param);
      } else {
        params.set(param, next);
      }
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams, param, defaultValue, omitDefault, validValues],
  );

  return [activeTab, setTab];
}
