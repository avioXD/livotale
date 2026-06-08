import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  DataTable,
  FilterField,
  ListToolbar,
  PaginationControls,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { liverCareOrderService } from '@/services/liverCare';
import {
  ORDER_ASSIGNED_TO_PRESETS,
  ORDER_CREATED_BY_PRESETS,
  ORDER_PAYMENT_PRESETS,
  ORDER_STATUS_PRESETS,
  assignedToLabel,
  createdByLabel,
} from '@/app/pages/admin/orders/orderDetailConfig';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import type { TableColumn } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';

function readFilterParam(params: URLSearchParams, key: string): string {
  return params.get(key) ?? '';
}

export function AdminOperationsOrdersTab() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState<LiverCareOrder[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftPayment, setDraftPayment] = useState(readFilterParam(searchParams, 'paymentStatus'));
  const [appliedPayment, setAppliedPayment] = useState(readFilterParam(searchParams, 'paymentStatus'));
  const [draftOrderStatus, setDraftOrderStatus] = useState(readFilterParam(searchParams, 'orderStatus'));
  const [appliedOrderStatus, setAppliedOrderStatus] = useState(readFilterParam(searchParams, 'orderStatus'));
  const [draftCreatedBy, setDraftCreatedBy] = useState(readFilterParam(searchParams, 'createdBy'));
  const [appliedCreatedBy, setAppliedCreatedBy] = useState(readFilterParam(searchParams, 'createdBy'));
  const [draftAssignedTo, setDraftAssignedTo] = useState(readFilterParam(searchParams, 'assignedTo'));
  const [appliedAssignedTo, setAppliedAssignedTo] = useState(readFilterParam(searchParams, 'assignedTo'));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setOrders(
        await liverCareOrderService.list({
          paymentStatus: appliedPayment || undefined,
          orderStatus: appliedOrderStatus || undefined,
          createdBy: appliedCreatedBy || undefined,
          assignedTo: appliedAssignedTo || undefined,
          search: appliedSearch || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [appliedPayment, appliedOrderStatus, appliedCreatedBy, appliedAssignedTo, appliedSearch]);

  const paged = paginateList(orders, page, pageSize);

  const columns: TableColumn<LiverCareOrder>[] = useMemo(
    () => [
      { key: 'order', header: 'Order #', render: (r) => <span className="font-medium">{r.orderNumber}</span> },
      {
        key: 'patient',
        header: 'Patient',
        render: (r) => (
          <Link
            to={`/patients/${r.patientId}`}
            className="text-livotale-pink hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {r.patientName}
          </Link>
        ),
      },
      { key: 'package', header: 'Package', render: (r) => r.packageCode },
      { key: 'amount', header: 'Amount', render: (r) => `₹${r.finalAmount.toLocaleString('en-IN')}` },
      {
        key: 'payment',
        header: 'Payment',
        render: (r) => (
          <Badge variant={r.paymentStatus === 'success' ? 'default' : 'outline'} className="capitalize">
            {r.paymentStatus}
          </Badge>
        ),
      },
      {
        key: 'status',
        header: 'Workflow',
        render: (r) => (
          <span className="text-xs text-muted-foreground">{ORDER_STATUS_LABELS[r.orderStatus]}</span>
        ),
      },
      {
        key: 'createdBy',
        header: 'Created by',
        render: (r) => <span className="text-xs">{createdByLabel(r.createdBy)}</span>,
      },
      {
        key: 'assignedTo',
        header: 'Assigned to',
        render: (r) => <span className="text-xs">{assignedToLabel(r)}</span>,
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

  const applyFilters = () => {
    setAppliedSearch(searchInput.trim());
    setAppliedPayment(draftPayment);
    setAppliedOrderStatus(draftOrderStatus);
    setAppliedCreatedBy(draftCreatedBy);
    setAppliedAssignedTo(draftAssignedTo);
    setPage(1);

    const next = new URLSearchParams(searchParams);
    next.set('tab', 'orders');
    const setOrDelete = (key: string, value: string) => {
      if (value) next.set(key, value);
      else next.delete(key);
    };
    setOrDelete('paymentStatus', draftPayment);
    setOrDelete('orderStatus', draftOrderStatus);
    setOrDelete('createdBy', draftCreatedBy);
    setOrDelete('assignedTo', draftAssignedTo);
    setSearchParams(next, { replace: true });
  };

  const resetFilters = () => {
    setSearchInput('');
    setDraftPayment('');
    setDraftOrderStatus('');
    setDraftCreatedBy('');
    setDraftAssignedTo('');
    setAppliedSearch('');
    setAppliedPayment('');
    setAppliedOrderStatus('');
    setAppliedCreatedBy('');
    setAppliedAssignedTo('');
    setPage(1);

    const next = new URLSearchParams(searchParams);
    next.set('tab', 'orders');
    next.delete('paymentStatus');
    next.delete('orderStatus');
    next.delete('createdBy');
    next.delete('assignedTo');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Liver care orders and payments. Filter by creator, assignee, payment, or workflow stage.
      </p>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search order #, patient, phone…"
        onApplyFilters={applyFilters}
        onResetFilters={resetFilters}
      >
        <FilterField label="Payment" htmlFor="ops-order-payment">
          <select
            id="ops-order-payment"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftPayment}
            onChange={(e) => setDraftPayment(e.target.value)}
          >
            {ORDER_PAYMENT_PRESETS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Workflow" htmlFor="ops-order-status">
          <select
            id="ops-order-status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftOrderStatus}
            onChange={(e) => setDraftOrderStatus(e.target.value)}
          >
            {ORDER_STATUS_PRESETS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Created by" htmlFor="ops-order-created-by">
          <select
            id="ops-order-created-by"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftCreatedBy}
            onChange={(e) => setDraftCreatedBy(e.target.value)}
          >
            {ORDER_CREATED_BY_PRESETS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Assigned to" htmlFor="ops-order-assigned-to">
          <select
            id="ops-order-assigned-to"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftAssignedTo}
            onChange={(e) => setDraftAssignedTo(e.target.value)}
          >
            {ORDER_ASSIGNED_TO_PRESETS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
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
        onRowClick={(r) => navigate(`/admin/orders/${r.id}`)}
      />

      <PaginationControls
        page={paged.page}
        pageSize={pageSize}
        total={paged.total}
        totalPages={paged.totalPages}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
