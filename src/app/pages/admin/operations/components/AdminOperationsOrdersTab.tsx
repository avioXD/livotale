import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DataTable,
  FilterField,
  ListToolbar,
  PaginationControls,
} from '@/components/common';
import { PAYMENT_STATUS_PRESETS } from '@/app/pages/admin/operations/adminOperationsConfig';
import { AdminCollectPaymentModal } from '@/app/pages/admin/operations/components/AdminCollectPaymentModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { adminOperationsService } from '@/services/admin/AdminOperationsService';
import type { ServiceOrder } from '@/types/adminOperations';
import type { TableColumn } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';

export function AdminOperationsOrdersTab() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftPayment, setDraftPayment] = useState('');
  const [appliedPayment, setAppliedPayment] = useState('');
  const [draftType, setDraftType] = useState('');
  const [appliedType, setAppliedType] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [collectOrder, setCollectOrder] = useState<ServiceOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setOrders(
        await adminOperationsService.listOrders({
          paymentStatus: appliedPayment || undefined,
          orderType: appliedType === 'appointment' || appliedType === 'pharmacy' ? appliedType : undefined,
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
  }, [appliedPayment, appliedType, appliedSearch]);

  const paged = paginateList(orders, page, pageSize);

  const columns: TableColumn<ServiceOrder>[] = useMemo(
    () => [
      { key: 'order', header: 'Order #', render: (r) => <span className="font-medium">{r.orderNumber}</span> },
      { key: 'patient', header: 'Patient', render: (r) => (
        <Link to={`/patients/${r.patientId}`} className="text-livotel-pink hover:underline" onClick={(e) => e.stopPropagation()}>
          {r.patientName}
        </Link>
      ) },
      { key: 'service', header: 'Service', render: (r) => r.serviceLabel },
      { key: 'type', header: 'Type', render: (r) => <span className="capitalize">{r.orderType}</span> },
      { key: 'amount', header: 'Amount', render: (r) => `₹${r.amount.toLocaleString('en-IN')}` },
      {
        key: 'payment',
        header: 'Payment',
        render: (r) => (
          <Badge variant={r.paymentStatus === 'paid' ? 'default' : 'outline'} className="capitalize">
            {r.paymentStatus}
          </Badge>
        ),
      },
      {
        key: 'placed',
        header: 'Placed',
        render: (r) =>
          new Date(r.placedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      },
      {
        key: 'actions',
        header: '',
        render: (r) =>
          r.paymentStatus !== 'paid' ? (
            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setCollectOrder(r); }}>
              Collect
            </Button>
          ) : null,
      },
    ],
    [],
  );

  const handleCollect = async (method: 'cash' | 'online' | 'qr', amount: number, notes: string) => {
    if (!collectOrder) return;
    setIsSaving(true);
    try {
      await adminOperationsService.collectPayment(collectOrder.id, {
        orderType: collectOrder.orderType,
        method,
        amount,
        notes: notes || undefined,
      });
      setCollectOrder(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Collection failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Appointment fees and pharmacy orders. Collect at front desk (cash / QR) or mark online demo payments.
      </p>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search order # or patient…"
        onApplyFilters={() => {
          setAppliedSearch(searchInput.trim());
          setAppliedPayment(draftPayment);
          setAppliedType(draftType);
          setPage(1);
        }}
        onResetFilters={() => {
          setSearchInput('');
          setDraftPayment('');
          setDraftType('');
          setAppliedSearch('');
          setAppliedPayment('');
          setAppliedType('');
          setPage(1);
        }}
      >
        <FilterField label="Payment" htmlFor="ops-order-payment">
          <select
            id="ops-order-payment"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftPayment}
            onChange={(e) => setDraftPayment(e.target.value)}
          >
            {PAYMENT_STATUS_PRESETS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Order type" htmlFor="ops-order-type">
          <select
            id="ops-order-type"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftType}
            onChange={(e) => setDraftType(e.target.value)}
          >
            <option value="">All types</option>
            <option value="appointment">Appointment</option>
            <option value="pharmacy">Pharmacy</option>
          </select>
        </FilterField>
      </ListToolbar>

      <DataTable
        columns={columns}
        data={paged.items}
        isLoading={isLoading}
        emptyMessage="No orders found."
        getRowKey={(r) => `${r.orderType}-${r.id}`}
        onRowClick={(r) => {
          if (r.orderType === 'appointment') {
            navigate(`/admin/appointments/${r.referenceId}`);
          }
        }}
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

      {collectOrder && (
        <AdminCollectPaymentModal
          order={collectOrder}
          isSaving={isSaving}
          onClose={() => setCollectOrder(null)}
          onCollect={handleCollect}
        />
      )}
    </div>
  );
}
