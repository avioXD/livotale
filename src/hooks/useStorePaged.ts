import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { StoreApi, UseBoundStore } from 'zustand';
import { paginateList } from '@/utils/pagination';

export type PagedSlice<T> = {
  items: T[];
  page: number;
  pageSize: number;
};

/**
 * Reactive client-side pagination for Zustand list stores.
 * Subscribes to page/items/pageSize so PaginationControls re-render on page change.
 */
export function useStorePaged<T, S>(
  useStore: UseBoundStore<StoreApi<S>>,
  selectSlice: (state: S) => PagedSlice<T>,
  selectSetPage?: (state: S) => (page: number) => void,
) {
  const { items, page, pageSize } = useStore(useShallow(selectSlice));
  const setPage = selectSetPage ? useStore(selectSetPage) : undefined;

  const paged = useMemo(
    () => paginateList(items, page, pageSize),
    [items, page, pageSize],
  );

  useEffect(() => {
    if (setPage && paged.page !== page) {
      setPage(paged.page);
    }
  }, [paged.page, page, setPage]);

  return paged;
}

/** Local-state tables that already hold items/page/pageSize in component state. */
export function usePagedList<T>(
  items: T[],
  page: number,
  pageSize: number,
  setPage?: (page: number) => void,
) {
  const paged = useMemo(
    () => paginateList(items, page, pageSize),
    [items, page, pageSize],
  );

  useEffect(() => {
    if (setPage && paged.page !== page) {
      setPage(paged.page);
    }
  }, [paged.page, page, setPage]);

  return paged;
}
