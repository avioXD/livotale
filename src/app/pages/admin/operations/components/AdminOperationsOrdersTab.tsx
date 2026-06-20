import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DataTable,
  FilterField,
  ListToolbar,
  PaginationControls,
  StatusBadge,
  ActiveFilterBanner,
} from '@/components/common';
import {
  ORDER_CREATED_BY_PRESETS,
  ORDER_PAYMENT_PRESETS,
  ORDER_STATUS_PRESETS,
  assignedToLabel,
} from '@/app/pages/admin/orders/orderDetailConfig';
import { orgPath } from '@/app/config/orgRoutes';
import {
  DEFAULT_OPS_ORDERS_FILTERS,
  useOpsOrdersStore,
} from '@/store/operations/opsOrdersStore';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import type { TableColumn } from '@/types';
import { countActiveFilters } from '@/utils/listFilters';
import { useStorePaged } from '@/hooks/useStorePaged';

export function AdminOperationsOrdersTab() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const technicians = useOpsOrdersStore((s) => s.technicians);
  const searchInput = useOpsOrdersStore((s) => s.searchInput);
  const draftFilters = useOpsOrdersStore((s) => s.draftFilters);
  const appliedFilters = useOpsOrdersStore((s) => s.appliedFilters);
  const appliedSearch = useOpsOrdersStore((s) => s.appliedSearch);
  const pageSize = useOpsOrdersStore((s) => s.pageSize);
  const filtersExpanded = useOpsOrdersStore((s) => s.filtersExpanded);
  const isLoading = useOpsOrdersStore((s) => s.isLoading);
  const error = useOpsOrdersStore((s) => s.error);
  const fetchItems = useOpsOrdersStore((s) => s.fetchItems);
  const fetchTechnicians = useOpsOrdersStore((s) => s.fetchTechnicians);
  const syncFromUrl = useOpsOrdersStore((s) => s.syncFromUrl);
  const setSearchInput = useOpsOrdersStore((s) => s.setSearchInput);
  const setDraftFilter = useOpsOrdersStore((s) => s.setDraftFilter);
  const applyFiltersStore = useOpsOrdersStore((s) => s.applyFilters);
  const resetFiltersStore = useOpsOrdersStore((s) => s.resetFilters);
  const setPage = useOpsOrdersStore((s) => s.setPage);
  const setPageSize = useOpsOrdersStore((s) => s.setPageSize);
  const setFiltersExpanded = useOpsOrdersStore((s) => s.setFiltersExpanded);

  const assignedToPresets = useMemo(
    () => [
      { value: '', label: 'All assignees' },
      { value: 'unassigned', label: 'Unassigned' },
      ...technicians.map((t) => ({ value: t.id, label: t.name })),
    ],
    [technicians],
  );

  const openOrder = useCallback((orderId: string) => navigate(orgPath(`/admin/orders/${orderId}`)), [navigate]);

  useEffect(() => {
    syncFromUrl(searchParams);
    void fetchTechnicians();
    void fetchItems();
  }, [searchParams, syncFromUrl, fetchTechnicians, fetchItems]);

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    const payment = ORDER_PAYMENT_PRESETS.find((p) => p.value === appliedFilters.paymentStatus);
    if (payment?.value) labels.push(`Payment: ${payment.label}`);
    const orderStatus = ORDER_STATUS_PRESETS.find((p) => p.value === appliedFilters.orderStatus);
    if (orderStatus?.value) labels.push(`Stage: ${orderStatus.label}`);
    const createdBy = ORDER_CREATED_BY_PRESETS.find((p) => p.value === appliedFilters.createdBy);
    if (createdBy?.value) labels.push(`Created by: ${createdBy.label}`);
    if (appliedFilters.assignedTo === 'unassigned') {
      labels.push('Assigned to: Unassigned');
    } else if (appliedFilters.assignedTo) {
      const tech = technicians.find((t) => t.id === appliedFilters.assignedTo);
      labels.push(`Assigned to: ${tech?.name ?? appliedFilters.assignedTo}`);
    }
    if (appliedSearch) labels.push(`Search: "${appliedSearch}"`);
    return labels;
  }, [appliedFilters, appliedSearch, technicians]);

  const paged = useStorePaged(
    useOpsOrdersStore,
    (s) => ({ items: s.items, page: s.page, pageSize: s.pageSize }),
    (s) => s.setPage,
  );
  const activeFilterCount = countActiveFilters(appliedFilters, DEFAULT_OPS_ORDERS_FILTERS, appliedSearch);

  const applyFilters = () => {
    const applied = applyFiltersStore();
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'orders');
    const setOrDelete = (key: string, value: string) => {
      if (value) next.set(key, value);
      else next.delete(key);
    };
    setOrDelete('orderStatus', applied.orderStatus);
    setOrDelete('paymentStatus', applied.paymentStatus);
    setOrDelete('createdBy', applied.createdBy);
    setOrDelete('assignedTo', applied.assignedTo);
    setSearchParams(next, { replace: true });
  };

  const resetFilters = () => {
    resetFiltersStore();
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'orders');
    next.delete('orderStatus');
    next.delete('paymentStatus');
    next.delete('createdBy');
    next.delete('assignedTo');
    setSearchParams(next, { replace: true });
  };

  const columns: TableColumn<LiverCareOrder>[] = useMemo(
    () => [
      {
        key: 'order',
        header: 'Order',
        render: (r) => (
          <div>
            <p className="font-medium">{r.orderNumber}</p>
            <p className="text-xs text-muted-foreground">{r.packageCode} · {r.packageName}</p>
          </div>
        ),
      },
      {
        key: 'patient',
        header: 'Patient',
        render: (r) => (
          <div>
            <p>{r.patientName}</p>
            <p className="text-xs text-muted-foreground">{r.patientPhone}</p>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (r) => (
          <StatusBadge status={r.orderStatus} domain="order" label={ORDER_STATUS_LABELS[r.orderStatus]} />
        ),
      },
      {
        key: 'assignedTo',
        header: 'Assigned to',
        render: (r) => {
          const label = assignedToLabel(r);
          return label === '—' ? (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          ) : (
            <span className="text-sm">{label}</span>
          );
        },
      },
      {
        key: 'placed',
        header: 'Created',
        render: (r) =>
          new Date(r.createdAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Liver care orders — workflow status, patient, and package. Click a row to open the order. Payment is handled on
        the order detail page.
      </p>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <ActiveFilterBanner labels={activeFilterLabels} onClear={resetFilters} />

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search order #, patient, phone…"
        onApplyFilters={applyFilters}
        onResetFilters={resetFilters}
        isLoading={isLoading}
        filtersExpanded={filtersExpanded}
        onFiltersExpandedChange={setFiltersExpanded}
        activeFilterCount={activeFilterCount}
      >
        <FilterField label="Workflow status" htmlFor="ops-order-status">
          <select
            id="ops-order-status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftFilters.orderStatus}
            onChange={(e) => setDraftFilter('orderStatus', e.target.value)}
          >
            {ORDER_STATUS_PRESETS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Payment status" htmlFor="ops-order-payment">
          <select
            id="ops-order-payment"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftFilters.paymentStatus}
            onChange={(e) => setDraftFilter('paymentStatus', e.target.value)}
          >
            {ORDER_PAYMENT_PRESETS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Created by" htmlFor="ops-order-created-by">
          <select
            id="ops-order-created-by"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftFilters.createdBy}
            onChange={(e) => setDraftFilter('createdBy', e.target.value)}
          >
            {ORDER_CREATED_BY_PRESETS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Assigned to" htmlFor="ops-order-assigned-to">
          <select
            id="ops-order-assigned-to"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftFilters.assignedTo}
            onChange={(e) => setDraftFilter('assignedTo', e.target.value)}
          >
            {assignedToPresets.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FilterField>
      </ListToolbar>

      <DataTable
        columns={columns}
        data={paged.items}
        isLoading={isLoading}
        emptyMessage="No orders found."
        getRowKey={(r) => r.id}
        onRowClick={(r) => openOrder(r.id)}
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
