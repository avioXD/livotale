import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable, FilterField, ListPageShell, ListToolbar, PaginationControls, StatusBadge } from '@/components/common';
import { Button } from '@/components/ui/button';
import { useEnquiriesAdminStore } from '@/store/enquiries';
import type { Enquiry } from '@/types/enquiry';
import type { TableColumn } from '@/types';
import { orgPath } from '@/app/config/orgRoutes';
import { countActiveFilters } from '@/utils/listFilters';
import { useStorePaged } from '@/hooks/useStorePaged';

const OPS_ENQUIRIES_PATH = orgPath('/admin/operations?tab=enquiries');
const DETAIL_PATH = orgPath('/admin/enquiries');

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interested', label: 'Interested' },
  { value: 'follow_up_required', label: 'Follow-up required' },
  { value: 'converted', label: 'Converted' },
  { value: 'not_interested', label: 'Not interested' },
  { value: 'closed', label: 'Closed' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'website', label: 'Website (auto)' },
  { value: 'whatsapp', label: 'WhatsApp (CRM)' },
  { value: 'manual', label: 'Manual' },
];

interface AdminEnquiriesPageProps {
  /** Render inside operations hub (no duplicate page header). */
  embedded?: boolean;
}

export function AdminEnquiriesPage({ embedded = false }: AdminEnquiriesPageProps) {
  const navigate = useNavigate();
  const searchInput = useEnquiriesAdminStore((s) => s.searchInput);
  const draftStatus = useEnquiriesAdminStore((s) => s.draftStatus);
  const draftSource = useEnquiriesAdminStore((s) => s.draftSource);
  const pageSize = useEnquiriesAdminStore((s) => s.pageSize);
  const isLoading = useEnquiriesAdminStore((s) => s.isLoading);
  const error = useEnquiriesAdminStore((s) => s.error);
  const fetchEnquiries = useEnquiriesAdminStore((s) => s.fetchEnquiries);
  const setSearchInput = useEnquiriesAdminStore((s) => s.setSearchInput);
  const setDraftStatus = useEnquiriesAdminStore((s) => s.setDraftStatus);
  const setDraftSource = useEnquiriesAdminStore((s) => s.setDraftSource);
  const applyFilters = useEnquiriesAdminStore((s) => s.applyFilters);
  const resetFilters = useEnquiriesAdminStore((s) => s.resetFilters);
  const setPage = useEnquiriesAdminStore((s) => s.setPage);
  const setPageSize = useEnquiriesAdminStore((s) => s.setPageSize);
  const setFiltersExpanded = useEnquiriesAdminStore((s) => s.setFiltersExpanded);
  const appliedStatus = useEnquiriesAdminStore((s) => s.appliedStatus);
  const appliedSource = useEnquiriesAdminStore((s) => s.appliedSource);
  const appliedSearch = useEnquiriesAdminStore((s) => s.appliedSearch);
  const filtersExpanded = useEnquiriesAdminStore((s) => s.filtersExpanded);

  useEffect(() => {
    void fetchEnquiries();
  }, [fetchEnquiries]);

  const paged = useStorePaged(
    useEnquiriesAdminStore,
    (s) => ({ items: s.items, page: s.page, pageSize: s.pageSize }),
    (s) => s.setPage,
  );
  const activeFilterCount = countActiveFilters(
    { status: appliedStatus, source: appliedSource },
    { status: '', source: '' },
    appliedSearch,
  );

  const columns: TableColumn<Enquiry>[] = useMemo(
    () => [
      {
        key: 'number',
        header: 'Enquiry #',
        render: (r) => (
          <div>
            <span className="font-medium">{r.enquiryNumber}</span>
            {(r.threadCount ?? 1) > 1 && (
              <p className="text-xs text-muted-foreground">
                Thread #{r.threadSequence} · {r.threadCount} enquiries
              </p>
            )}
          </div>
        ),
      },
      { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.patientName}</span> },
      { key: 'phone', header: 'Phone', render: (r) => r.phone },
      {
        key: 'source',
        header: 'Source',
        render: (r) => (
          <span className="capitalize text-xs">
            {r.source === 'website' ? 'Website' : r.source === 'whatsapp' ? 'WhatsApp' : 'Manual'}
          </span>
        ),
      },
      { key: 'package', header: 'Package', render: (r) => r.preferredPackageCode ?? '—' },
      {
        key: 'status',
        header: 'Status',
        render: (r) => (
          <StatusBadge status={r.status} domain="enquiry" />
        ),
      },
      {
        key: 'date',
        header: 'Received',
        render: (r) =>
          new Date(r.enquiryAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      },
      {
        key: 'actions',
        header: '',
        className: 'w-[200px]',
        render: (r) => (
          <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`${DETAIL_PATH}/${r.id}?tab=create-order`)}
            >
              Create order
            </Button>
            {r.status === 'converted' && r.orderId && (
              <Button size="sm" variant="outline" asChild>
                <Link to={orgPath(`/admin/orders/${r.orderId}`)}>Open order</Link>
              </Button>
            )}
          </div>
        ),
      },
    ],
    [navigate],
  );

  const addLeadAction = (
    <Button onClick={() => navigate(`${DETAIL_PATH}/new?tab=edit`)}>Add lead</Button>
  );

  const toolbar = (
        <ListToolbar
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Search name, phone, enquiry #…"
          onApplyFilters={applyFilters}
          onResetFilters={resetFilters}
          isLoading={isLoading}
          filtersExpanded={filtersExpanded}
          onFiltersExpandedChange={setFiltersExpanded}
          activeFilterCount={activeFilterCount}
        >
          <FilterField label="Status" htmlFor="enq-filter-status">
            <select
              id="enq-filter-status"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={draftStatus}
              onChange={(e) => setDraftStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Source" htmlFor="enq-filter-source">
            <select
              id="enq-filter-source"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={draftSource}
              onChange={(e) => setDraftSource(e.target.value)}
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FilterField>
        </ListToolbar>
  );

  const footer = (
    <PaginationControls
      page={paged.page}
      pageSize={pageSize}
      total={paged.total}
      totalPages={paged.totalPages}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      isLoading={isLoading}
    />
  );

  const table = (
    <DataTable
      columns={columns}
      data={paged.items}
      isLoading={isLoading}
      emptyMessage="No enquiries yet. Add a WhatsApp lead or wait for website submissions."
      getRowKey={(r) => r.id}
      onRowClick={(r) => navigate(`${DETAIL_PATH}/${r.id}?tab=view`)}
    />
  );

  if (embedded) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-end gap-2">{addLeadAction}</div>
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {toolbar}
        {table}
        {footer}
      </div>
    );
  }

  return (
    <ListPageShell
      title="Enquiries"
      description="CRM queue — website leads auto-injected; WhatsApp and phone leads added manually. Name + phone are primary."
      actions={addLeadAction}
      error={error}
      toolbar={toolbar}
      footer={footer}
    >
      {table}
    </ListPageShell>
  );
}

export { OPS_ENQUIRIES_PATH };
