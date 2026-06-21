import { useCallback, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { FiPlus } from 'react-icons/fi';
import {
  DataTable,
  FilterField,
  ListToolbar,
  PaginationControls,
} from '@/components/common';
import { PageHeader } from '@/components/common/PageHeader';
import { isAdminRole } from '@/app/config/productRoles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_PARTNER_LABS_FILTERS,
  usePartnerLabsListStore,
  type PartnerLabListRow,
} from '@/store/labs/partnerLabsListStore';
import { useUserRole } from '@/store';
import type { TableColumn } from '@/types';
import { orgPath } from '@/app/config/orgRoutes';
import { countActiveFilters } from '@/utils/listFilters';
import { useStorePaged } from '@/hooks/useStorePaged';

const CREATE_PATH = orgPath('/admin/staff/lab-partners/new');

export function AdminPartnerLabsPage() {
  const navigate = useNavigate();
  const userRole = useUserRole();
  const canManage = isAdminRole(userRole);
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
  } = usePartnerLabsListStore(
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
    usePartnerLabsListStore,
    (s) => ({ items: s.items, page: s.page, pageSize: s.pageSize }),
    (s) => s.setPage,
  );
  const activeFilterCount = countActiveFilters(
    appliedFilters,
    DEFAULT_PARTNER_LABS_FILTERS,
    appliedSearch,
  );

  const openLab = useCallback(
    (id: string) => navigate(orgPath(`/admin/staff/lab-partners/${id}`)),
    [navigate],
  );

  const columns: TableColumn<PartnerLabListRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Lab',
        render: (r) => (
          <div>
            <p className="font-medium">{r.name}</p>
            <p className="text-xs text-muted-foreground">
              {r.city}, {r.state}
            </p>
          </div>
        ),
      },
      {
        key: 'contact',
        header: 'Primary POC',
        render: (r) => (
          <div className="text-sm">
            <p>{r.contactPerson}</p>
            {r.contactDesignation && (
              <p className="text-xs text-muted-foreground">{r.contactDesignation}</p>
            )}
            <p className="text-xs text-muted-foreground">{r.email}</p>
          </div>
        ),
      },
      {
        key: 'pocs',
        header: 'Additional POCs',
        render: (r) => r.pocContacts?.length ?? 0,
      },
      {
        key: 'reports',
        header: 'Reports uploaded',
        render: (r) => r.reportsUploaded,
      },
      {
        key: 'pipeline',
        header: 'In pipeline',
        render: (r) => r.inPipeline,
      },
      {
        key: 'status',
        header: 'Status',
        render: (r) => (
          <Badge variant={r.active ? 'default' : 'outline'}>{r.active ? 'Active' : 'Inactive'}</Badge>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Lab partners"
          description="Pathology partner profiles — POC contacts, legal documents, test pricing, and report volume. Labs email PDFs; operations uploads on each order."
        />
        {canManage && (
          <Button asChild>
            <Link to={CREATE_PATH}>
              <FiPlus className="mr-2 h-4 w-4" />
              Add lab partner
            </Link>
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search lab, city, contact, email…"
        onApplyFilters={applyFilters}
        onResetFilters={resetFilters}
        isLoading={isLoading}
        filtersExpanded={filtersExpanded}
        onFiltersExpandedChange={setFiltersExpanded}
        activeFilterCount={activeFilterCount}
      >
        <FilterField label="Status" htmlFor="lab-filter-status">
          <select
            id="lab-filter-status"
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
        emptyMessage="No lab partner profiles configured."
        getRowKey={(r) => r.id}
        onRowClick={(r) => openLab(r.id)}
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

      <p className="text-xs text-muted-foreground">
        Tip: use{' '}
        <Link to={orgPath('/admin/operations?tab=partner-lab')} className="text-livotale-pink hover:underline">
          Operations → Lab reports
        </Link>{' '}
        for live order workflow (dispatch, PDF upload, AI review).
      </p>
    </div>
  );
}
