/** Count non-default applied filters plus active search. */
export function countActiveFilters<T extends Record<string, unknown>>(
  appliedFilters: T,
  defaultFilters: T,
  appliedSearch?: string,
): number {
  let count = appliedSearch?.trim() ? 1 : 0;
  for (const key of Object.keys(defaultFilters) as (keyof T)[]) {
    const value = appliedFilters[key];
    const defaultValue = defaultFilters[key];
    if (value !== defaultValue && value !== '' && value != null) {
      count++;
    }
  }
  return count;
}
