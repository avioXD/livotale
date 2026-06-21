import { useEffect, useMemo, useState } from 'react';
import { countActiveFilters } from '@/utils/listFilters';
import { useNavigate } from 'react-router-dom';
import { DataTable, ListToolbar, PageHeader, PaginationControls } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { technicianOrderService } from '@/services/liverCare';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { TechnicianOrderDetail, TechnicianOrderVisit } from '@/types/fibrosisScan';
import type { TableColumn } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';
import { orgPath } from '@/app/config/orgRoutes';

const VISIT_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  visit_started: 'En route',
  reached_location: 'At location',
  scan_in_progress: 'Scan in progress',
  scan_completed: 'Scan done',
  unable_to_complete: 'Unable to complete',
};

function formatFieldOrderAddress(row: TechnicianOrderDetail): string {
  return [row.address, row.city, row.pincode].filter(Boolean).join(', ') || '—';
}

type ScanBucket = 'pending' | 'completed';

function isCompletedScanVisit(visit?: TechnicianOrderVisit): boolean {
  const step = visit?.visitStep;
  return step === 'scan_completed' || step === 'unable_to_complete';
}

function bucketForOrder(order: LiverCareOrder, visit?: TechnicianOrderVisit): ScanBucket {
  if (order.orderStatus === 'scan_completed' || isCompletedScanVisit(visit)) {
    return 'completed';
  }
  return 'pending';
}

export function TechnicianOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<TechnicianOrderDetail[]>([]);
  const [visits, setVisits] = useState<Record<string, TechnicianOrderVisit>>({});
  const [bucket, setBucket] = useState<ScanBucket>('pending');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
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

  const bucketCounts = useMemo(() => {
    let pending = 0;
    let completed = 0;
    for (const o of orders) {
      if (bucketForOrder(o, visits[o.id]) === 'completed') completed += 1;
      else pending += 1;
    }
    return { pending, completed };
  }, [orders, visits]);

  const filtered = useMemo(() => {
    const inBucket = orders.filter((o) => bucketForOrder(o, visits[o.id]) === bucket);
    if (!appliedSearch) return inBucket;
    const q = appliedSearch.toLowerCase();
    return inBucket.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.patientName.toLowerCase().includes(q) ||
        o.patientPhone.includes(q),
    );
  }, [orders, visits, bucket, appliedSearch]);

  const paged = paginateList(filtered, page, pageSize);
  const activeFilterCount = countActiveFilters({}, {}, appliedSearch);

  useEffect(() => {
    if (paged.page !== page) setPage(paged.page);
  }, [paged.page, page]);

  const columns: TableColumn<TechnicianOrderDetail>[] = useMemo(
    () => [
      { key: 'order', header: 'Order', render: (r) => <span className="font-medium">{r.orderNumber}</span> },
      { key: 'patient', header: 'Patient', render: (r) => r.patientName },
      { key: 'phone', header: 'Phone', render: (r) => r.patientPhone },
      {
        key: 'address',
        header: 'Address',
        render: (r) => (
          <p className="max-w-[180px] truncate text-sm text-muted-foreground" title={formatFieldOrderAddress(r)}>
            {formatFieldOrderAddress(r)}
          </p>
        ),
      },
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
        header: 'Visit status',
        render: (r) => {
          const step = visits[r.id]?.visitStep ?? 'assigned';
          return <Badge variant="outline">{VISIT_LABELS[step] ?? step}</Badge>;
        },
      },
    ],
    [visits],
  );

  const emptyMessage =
    bucket === 'pending'
      ? 'No visits pending scan.'
      : 'No completed scans yet.';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field orders"
        description="Pending scan visits and completed FibroScan visits only — pathology and downstream steps are handled by operations."
      />

      <Tabs
        value={bucket}
        onValueChange={(value) => {
          setBucket(value as ScanBucket);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="pending">Pending scan ({bucketCounts.pending})</TabsTrigger>
          <TabsTrigger value="completed">Completed scans ({bucketCounts.completed})</TabsTrigger>
        </TabsList>
      </Tabs>

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
        filtersExpanded={filtersExpanded}
        onFiltersExpandedChange={setFiltersExpanded}
        activeFilterCount={activeFilterCount}
      />

      <DataTable
        columns={columns}
        data={paged.items}
        isLoading={loading}
        emptyMessage={emptyMessage}
        getRowKey={(r) => r.id}
        onRowClick={(r) => navigate(orgPath(`/technician/orders/${r.id}`))}
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
