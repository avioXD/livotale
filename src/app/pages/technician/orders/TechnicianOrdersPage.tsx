import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, ListToolbar, PageHeader, PaginationControls } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { technicianOrderService } from '@/services/liverCare';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import type { TechnicianOrderVisit } from '@/types/fibrosisScan';
import type { TableColumn } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';

const VISIT_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  visit_started: 'En route',
  reached_location: 'At location',
  scan_in_progress: 'Scan in progress',
  scan_completed: 'Scan done',
  unable_to_complete: 'Unable to complete',
};

export function TechnicianOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<LiverCareOrder[]>([]);
  const [visits, setVisits] = useState<Record<string, TechnicianOrderVisit>>({});
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void technicianOrderService.listAssigned().then(async (rows) => {
      setOrders(rows);
      const visitMap: Record<string, TechnicianOrderVisit> = {};
      await Promise.all(
        rows.map(async (o) => {
          const v = await technicianOrderService.getVisit(o.id);
          if (v) visitMap[o.id] = v;
        }),
      );
      setVisits(visitMap);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!appliedSearch) return orders;
    const q = appliedSearch.toLowerCase();
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.patientName.toLowerCase().includes(q) ||
        o.patientPhone.includes(q),
    );
  }, [orders, appliedSearch]);

  const paged = paginateList(filtered, page, pageSize);

  const columns: TableColumn<LiverCareOrder>[] = useMemo(
    () => [
      { key: 'order', header: 'Order', render: (r) => <span className="font-medium">{r.orderNumber}</span> },
      { key: 'patient', header: 'Patient', render: (r) => r.patientName },
      { key: 'phone', header: 'Phone', render: (r) => r.patientPhone },
      { key: 'package', header: 'Package', render: (r) => r.packageCode },
      {
        key: 'schedule',
        header: 'Scan schedule',
        render: (r) =>
          r.scanScheduledAt
            ? new Date(r.scanScheduledAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
            : '—',
      },
      {
        key: 'visit',
        header: 'Visit step',
        render: (r) => {
          const step = visits[r.id]?.visitStep ?? 'assigned';
          return <Badge variant="outline">{VISIT_LABELS[step] ?? step}</Badge>;
        },
      },
      {
        key: 'status',
        header: 'Order status',
        render: (r) => <span className="text-xs text-muted-foreground">{ORDER_STATUS_LABELS[r.orderStatus]}</span>,
      },
    ],
    [visits],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Liver Fibrosis Scan orders"
        description="Assigned home visits — capture scan data and update visit status."
      />

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search patient, order #, phone…"
        onApplyFilters={() => {
          setAppliedSearch(searchInput.trim().toLowerCase());
          setPage(1);
        }}
        onResetFilters={() => {
          setSearchInput('');
          setAppliedSearch('');
          setPage(1);
        }}
      />

      <DataTable
        columns={columns}
        data={paged.items}
        isLoading={loading}
        emptyMessage="No assigned orders."
        getRowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/technician/orders/${r.id}`)}
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
