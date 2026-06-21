import type { ReactNode } from 'react';

export interface PaginationState {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListQueryParams {
  page: number;
  pageSize: number;
  search?: string;
}

export interface ListFetchParams<TFilters extends Record<string, unknown>> extends ListQueryParams {
  filters: TFilters;
}

export interface ListStoreState<TItem, TFilters extends Record<string, unknown>> {
  items: TItem[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
  searchInput: string;
  appliedSearch: string;
  draftFilters: TFilters;
  appliedFilters: TFilters;
  isLoading: boolean;
  error: string | null;
}

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
}
