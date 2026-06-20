import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import {
  DataTable,
  FilterField,
  ListToolbar,
  PageHeader,
  PaginationControls,
} from '@/components/common';
import { orgPath } from '@/app/config/orgRoutes';
import { Badge } from '@/components/ui/badge';
import {
  DEFAULT_BANK_DIRECTORY_FILTERS,
  useBankDirectoryStore,
} from '@/store';
import type { BankDetailsDirectoryRow, BankVerificationStatus } from '@/types/bankDetails';
import type { TableColumn } from '@/types';
import { countActiveFilters } from '@/utils/listFilters';
import { useStorePaged } from '@/hooks/useStorePaged';

function verificationBadgeVariant(status: BankVerificationStatus | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'verified':
      return 'default';
    case 'rejected':
      return 'destructive';
    case 'pending':
      return 'secondary';
    default:
      return 'outline';
  }
}

function staffDetailHref(row: BankDetailsDirectoryRow): string | null {
  if (row.staffMemberId && row.staffRoleSlug) {
    return orgPath(`/admin/staff/${row.staffRoleSlug}/${row.staffMemberId}?tab=bank`);
  }
  return null;
}

export function AdminBankDetailsDirectoryPage() {
  const {
    items,
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
  } = useBankDirectoryStore(
    useShallow((s) => ({
      items: s.items,
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

  const roleOptions = useMemo(() => {
    const roles = new Set(items.map((r) => r.role).filter(Boolean));
    return Array.from(roles).sort();
  }, [items]);

  const paged = useStorePaged(
    useBankDirectoryStore,
    (s) => ({ items: s.items, page: s.page, pageSize: s.pageSize }),
    (s) => s.setPage,
  );
  const activeFilterCount = countActiveFilters(
    appliedFilters,
    DEFAULT_BANK_DIRECTORY_FILTERS,
    appliedSearch,
  );

  const columns: TableColumn<BankDetailsDirectoryRow>[] = useMemo(
    () => [
      {
        key: 'user',
        header: 'User',
        render: (row) => {
          const href = staffDetailHref(row);
          return (
            <div>
              {href ? (
                <Link to={href} className="font-medium text-primary hover:underline">
                  {row.fullName}
                </Link>
              ) : (
                <span className="font-medium">{row.fullName}</span>
              )}
              {row.email && <p className="text-xs text-muted-foreground">{row.email}</p>}
            </div>
          );
        },
      },
      {
        key: 'role',
        header: 'Role',
        render: (row) => <span className="capitalize">{row.role.replace(/_/g, ' ').toLowerCase()}</span>,
      },
      {
        key: 'ifsc',
        header: 'IFSC',
        render: (row) => <span className="font-mono">{row.ifscCode ?? '—'}</span>,
      },
      {
        key: 'account',
        header: 'Account',
        render: (row) => (
          <span className="font-mono">{row.accountNumberLast4 ? `****${row.accountNumberLast4}` : '—'}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <Badge variant={verificationBadgeVariant(row.verificationStatus)} className="capitalize">
            {row.verificationStatus ?? 'pending'}
          </Badge>
        ),
      },
      {
        key: 'payout',
        header: 'Payout',
        render: (row) =>
          row.requiredForPayout ? (
            <Badge variant="destructive">Required</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank details directory"
        description="Review payout bank accounts across staff and partners. Super Admin only."
      />

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Name or email"
        onApplyFilters={applyFilters}
        onResetFilters={resetFilters}
        isLoading={isLoading}
        filtersExpanded={filtersExpanded}
        onFiltersExpandedChange={setFiltersExpanded}
        activeFilterCount={activeFilterCount}
      >
        <FilterField label="Verification status" htmlFor="bank-filter-status">
          <select
            id="bank-filter-status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftFilters.status}
            onChange={(e) =>
              setDraftFilter('status', e.target.value as typeof draftFilters.status)
            }
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </FilterField>
        <FilterField label="Role" htmlFor="bank-filter-role">
          <select
            id="bank-filter-role"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftFilters.role}
            onChange={(e) => setDraftFilter('role', e.target.value)}
          >
            <option value="all">All roles</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </FilterField>
      </ListToolbar>

      <DataTable
        columns={columns}
        data={paged.items}
        isLoading={isLoading}
        emptyMessage="No bank detail records match your filters."
        getRowKey={(row) => row.userId}
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
