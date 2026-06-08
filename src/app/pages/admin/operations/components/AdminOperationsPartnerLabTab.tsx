import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable, ListToolbar, PaginationControls } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { pathologyService } from '@/services/liverCare';
import type { SampleDispatch } from '@/types/sampleDispatch';
import { SAMPLE_DISPATCH_LABELS } from '@/types/sampleDispatch';
import type { TableColumn } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending_dispatch', label: 'Pending dispatch' },
  { value: 'dispatched', label: 'Sample sent' },
  { value: 'received_at_lab', label: 'Received at lab' },
  { value: 'awaiting_report', label: 'Awaiting report (email)' },
];

export function AdminOperationsPartnerLabTab() {
  const [queue, setQueue] = useState<SampleDispatch[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setQueue(await pathologyService.listSampleDispatchQueue());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    let rows = queue;
    if (appliedStatus) rows = rows.filter((r) => r.status === appliedStatus);
    if (appliedSearch) {
      rows = rows.filter((r) =>
        [r.partnerLabName, r.orderId, r.courierRef, r.status]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(appliedSearch),
      );
    }
    return rows;
  }, [queue, appliedSearch, appliedStatus]);

  const paged = paginateList(filtered, page, pageSize);

  const columns: TableColumn<SampleDispatch>[] = useMemo(
    () => [
      { key: 'order', header: 'Order', render: (r) => <span className="font-mono text-xs">{r.orderId}</span> },
      { key: 'lab', header: 'Partner lab', render: (r) => r.partnerLabName },
      {
        key: 'status',
        header: 'Status',
        render: (r) => <Badge variant="outline">{SAMPLE_DISPATCH_LABELS[r.status]}</Badge>,
      },
      { key: 'courier', header: 'Courier ref', render: (r) => r.courierRef ?? '—' },
      {
        key: 'updated',
        header: 'Updated',
        render: (r) => new Date(r.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      },
      {
        key: 'action',
        header: '',
        render: (r) => (
          <Link to={`/admin/orders/${r.orderId}`} className="text-sm text-primary underline">
            Open order
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Partner lab workflow — technician/ops sends blood sample externally; lab emails PDF; ops uploads → AI extraction → letterhead report. No in-house lab processing.
      </p>

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search lab, order ID, courier…"
        onApplyFilters={() => {
          setAppliedSearch(searchInput.trim().toLowerCase());
          setAppliedStatus(draftStatus);
          setPage(1);
        }}
        onResetFilters={() => {
          setSearchInput('');
          setDraftStatus('');
          setAppliedSearch('');
          setAppliedStatus('');
          setPage(1);
        }}
      >
        <div className="space-y-1">
          <label htmlFor="pl-status" className="text-xs text-muted-foreground">Status</label>
          <select
            id="pl-status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftStatus}
            onChange={(e) => setDraftStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </ListToolbar>

      <DataTable
        columns={columns}
        data={paged.items}
        isLoading={loading}
        emptyMessage="No partner lab dispatches in queue."
        getRowKey={(r) => r.id}
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
