import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  DataTable,
  FilterField,
  ListToolbar,
  PageHeader,
  PaginationControls,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import {
  DEFAULT_AUDIT_LOG_FILTERS,
  useAuditLogStore,
} from '@/store';
import type { AuditLogEntry } from '@/types/adminDashboard';
import type { TableColumn } from '@/types';
import { countActiveFilters } from '@/utils/listFilters';
import { useStorePaged } from '@/hooks/useStorePaged';

export function AdminAuditLogPage() {
  const {
    searchInput,
    draftFilters,
    appliedFilters,
    appliedSearch,
    pageSize,
    filtersExpanded,
    isLoading,
    error,
    fetchItems,
    setSearchInput,
    setDraftFilter,
    applyFilters,
    resetFilters,
    setPage,
    setPageSize,
    setFiltersExpanded,
  } = useAuditLogStore(
    useShallow((s) => ({
      searchInput: s.searchInput,
      draftFilters: s.draftFilters,
      appliedFilters: s.appliedFilters,
      appliedSearch: s.appliedSearch,
      pageSize: s.pageSize,
      filtersExpanded: s.filtersExpanded,
      isLoading: s.isLoading,
      error: s.error,
      fetchItems: s.fetchItems,
      setSearchInput: s.setSearchInput,
      setDraftFilter: s.setDraftFilter,
      applyFilters: s.applyFilters,
      resetFilters: s.resetFilters,
      setPage: s.setPage,
      setPageSize: s.setPageSize,
      setFiltersExpanded: s.setFiltersExpanded,
    })),
  );

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const paged = useStorePaged(
    useAuditLogStore,
    (s) => ({ items: s.items, page: s.page, pageSize: s.pageSize }),
    (s) => s.setPage,
  );
  const activeFilterCount = countActiveFilters(
    appliedFilters,
    DEFAULT_AUDIT_LOG_FILTERS,
    appliedSearch,
  );

  const columns: TableColumn<AuditLogEntry>[] = useMemo(
    () => [
      {
        key: 'when',
        header: 'When',
        render: (log) => new Date(log.performedAt).toLocaleString(),
      },
      {
        key: 'action',
        header: 'Action',
        render: (log) => <Badge variant="outline">{log.action}</Badge>,
      },
      {
        key: 'entity',
        header: 'Entity',
        render: (log) => `${log.entityType} / ${log.entityId}`,
      },
      {
        key: 'by',
        header: 'By',
        render: (log) => log.performedBy,
      },
      {
        key: 'change',
        header: 'Change',
        render: (log) => (
          <span className="text-muted-foreground">{log.newValue ?? log.oldValue ?? '—'}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Administrative actions on enquiries, orders, scans, reports, and prescriptions."
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search action, entity, user, change…"
        onApplyFilters={applyFilters}
        onResetFilters={resetFilters}
        isLoading={isLoading}
        filtersExpanded={filtersExpanded}
        onFiltersExpandedChange={setFiltersExpanded}
        activeFilterCount={activeFilterCount}
      >
        <FilterField label="Entity type" htmlFor="audit-entity-type">
          <input
            id="audit-entity-type"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="service_order"
            value={draftFilters.entityType}
            onChange={(e) => setDraftFilter('entityType', e.target.value)}
          />
        </FilterField>
        <FilterField label="Entity ID" htmlFor="audit-entity-id">
          <input
            id="audit-entity-id"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="lco-3"
            value={draftFilters.entityId}
            onChange={(e) => setDraftFilter('entityId', e.target.value)}
          />
        </FilterField>
      </ListToolbar>

      <DataTable
        columns={columns}
        data={paged.items}
        isLoading={isLoading}
        emptyMessage="No audit entries match filters."
        getRowKey={(log) => log.id}
      />

      <PaginationControls
        page={paged.page}
        pageSize={pageSize}
        total={paged.total}
        totalPages={paged.totalPages}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
      />
    </div>
  );
}
