import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import {
  DataTable,
  FilterField,
  ListToolbar,
  PageHeader,
  PaginationControls,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_PACKAGES_FILTERS,
  filterPackages,
  usePackagesAdminStore,
} from '@/store/packages';
import type { LiverCarePackage } from '@/types/package';
import type { TableColumn } from '@/types/common';
import { orgPath } from '@/app/config/orgRoutes';
import { countActiveFilters } from '@/utils/listFilters';
import { useStorePaged } from '@/hooks/useStorePaged';

const LIST_PATH = orgPath('/admin/packages');

function formatPrice(pkg: LiverCarePackage): string {
  return `₹${(pkg.discountPrice ?? pkg.price).toLocaleString('en-IN')}`;
}

export function AdminPackagesPage() {
  const navigate = useNavigate();
  const {
    searchInput,
    draftFilters,
    appliedFilters,
    appliedSearch,
    pageSize,
    filtersExpanded,
    isLoading,
    error,
    fetchPackages,
    setSearchInput,
    setDraftFilter,
    applyFilters,
    resetFilters,
    setPage,
    setPageSize,
    setFiltersExpanded,
  } = usePackagesAdminStore(
    useShallow((s) => ({
      searchInput: s.searchInput,
      draftFilters: s.draftFilters,
      appliedFilters: s.appliedFilters,
      appliedSearch: s.appliedSearch,
      pageSize: s.pageSize,
      filtersExpanded: s.filtersExpanded,
      isLoading: s.isLoading,
      error: s.error,
      fetchPackages: s.fetchPackages,
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
    void fetchPackages();
  }, [fetchPackages]);

  const paged = useStorePaged(
    usePackagesAdminStore,
    (s) => ({
      items: filterPackages(s.packages, s.appliedSearch, s.appliedFilters),
      page: s.page,
      pageSize: s.pageSize,
    }),
    (s) => s.setPage,
  );
  const activeFilterCount = countActiveFilters(
    appliedFilters,
    DEFAULT_PACKAGES_FILTERS,
    appliedSearch,
  );

  const columns: TableColumn<LiverCarePackage>[] = useMemo(
    () => [
      {
        key: 'code',
        header: 'Code',
        render: (p) => <span className="font-medium">{p.code}</span>,
      },
      {
        key: 'name',
        header: 'Package',
        render: (p) => (
          <div>
            <p className="font-medium">{p.name}</p>
            {p.subtitle && <p className="text-xs text-muted-foreground">{p.subtitle}</p>}
          </div>
        ),
      },
      {
        key: 'price',
        header: 'Price',
        render: (p) => formatPrice(p),
      },
      {
        key: 'workflow',
        header: 'Workflow',
        render: (p) => (
          <span className="text-xs text-muted-foreground">
            Scan {p.fibrosisScanIncluded ? '✓' : '—'} · Path {p.pathologyIncluded ? '✓' : '—'} · Consult {p.consultationIncluded ? '✓' : '—'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (p) => (
          <div className="flex flex-wrap gap-1">
            {p.active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}
            {p.visibilityWeb && <Badge variant="secondary">Web</Badge>}
            {p.recommendedTag && <Badge variant="secondary">★</Badge>}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Liver care packages"
        description="List of all packages. Click a row to view or edit. Public site: /packages."
        actions={<Button onClick={() => navigate(`${LIST_PATH}/new?tab=edit`)}>Add package</Button>}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search by code or name…"
        onApplyFilters={applyFilters}
        onResetFilters={resetFilters}
        isLoading={isLoading}
        filtersExpanded={filtersExpanded}
        onFiltersExpandedChange={setFiltersExpanded}
        activeFilterCount={activeFilterCount}
      >
        <FilterField label="Status" htmlFor="pkg-filter-status">
          <select
            id="pkg-filter-status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftFilters.status}
            onChange={(e) => setDraftFilter('status', e.target.value as '' | 'active' | 'inactive')}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </FilterField>
      </ListToolbar>

      <DataTable
        columns={columns}
        data={paged.items}
        isLoading={isLoading}
        emptyMessage="No packages yet. Add your first package."
        getRowKey={(p) => p.id}
        onRowClick={(p) => navigate(`${LIST_PATH}/${p.id}?tab=view`)}
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
