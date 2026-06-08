import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DataTable,
  FilterField,
  ListToolbar,
  PageHeader,
  PaginationControls,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { doctorConsultationService } from '@/services/liverCare';
import type { Consultation } from '@/types/consultation';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import type { TableColumn } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'pending_rx', label: 'Rx pending' },
  { value: 'completed', label: 'Completed' },
] as const;

function matchesFilter(
  order: LiverCareOrder,
  consultation: Consultation | null | undefined,
  statusFilter: string,
): boolean {
  if (!statusFilter) return true;
  if (statusFilter === 'scheduled') {
    return ['consultation_pending', 'doctor_assigned'].includes(order.orderStatus)
      || consultation?.status === 'consultation_scheduled'
      || consultation?.status === 'consultation_in_progress';
  }
  if (statusFilter === 'pending_rx') return order.orderStatus === 'prescription_pending';
  if (statusFilter === 'completed') {
    return ['prescription_generated', 'completed'].includes(order.orderStatus)
      || consultation?.status === 'prescription_published';
  }
  return true;
}

export function DoctorConsultationsPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<LiverCareOrder[]>([]);
  const [consultations, setConsultations] = useState<Record<string, Consultation | null>>({});
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await doctorConsultationService.listAssignedOrders();
    setOrders(rows);
    const consultMap: Record<string, Consultation | null> = {};
    await Promise.all(
      rows.map(async (order) => {
        consultMap[order.id] = await doctorConsultationService.getConsultation(order.id);
      }),
    );
    setConsultations(consultMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    return orders.filter((order) => {
      if (!matchesFilter(order, consultations[order.id], appliedStatus)) return false;
      if (!q) return true;
      const hay = [
        order.patientName,
        order.orderNumber,
        order.packageName,
        order.patientPhone,
        ORDER_STATUS_LABELS[order.orderStatus],
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [orders, consultations, appliedSearch, appliedStatus]);

  const paged = paginateList(filtered, page, pageSize);

  const columns: TableColumn<LiverCareOrder>[] = useMemo(
    () => [
      {
        key: 'patient',
        header: 'Patient',
        render: (order) => (
          <div>
            <p className="font-medium">{order.patientName}</p>
            <p className="text-xs text-muted-foreground">{order.patientPhone}</p>
          </div>
        ),
      },
      {
        key: 'order',
        header: 'Order',
        render: (order) => (
          <div>
            <p>{order.orderNumber}</p>
            <p className="text-xs text-muted-foreground">{order.packageName}</p>
          </div>
        ),
      },
      {
        key: 'scheduled',
        header: 'Consultation',
        render: (order) => {
          const c = consultations[order.id];
          const at = order.consultationScheduledAt ?? c?.scheduledAt;
          return at ? new Date(at).toLocaleString() : '—';
        },
      },
      {
        key: 'status',
        header: 'Status',
        render: (order) => (
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline">{ORDER_STATUS_LABELS[order.orderStatus]}</Badge>
            {consultations[order.id] && (
              <Badge variant="secondary" className="capitalize">
                {consultations[order.id]!.status.replaceAll('_', ' ')}
              </Badge>
            )}
          </div>
        ),
      },
    ],
    [consultations],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultations"
        description="Assigned consultations — open a row to review patient data, visits, and prescriptions."
      />

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search patient, order, phone…"
        onApplyFilters={() => {
          setAppliedSearch(searchInput);
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
        isLoading={loading}
      >
        <FilterField label="Status">
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={draftStatus}
            onChange={(e) => setDraftStatus(e.target.value)}
          >
            {STATUS_FILTERS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FilterField>
      </ListToolbar>

      <DataTable
        columns={columns}
        data={paged.items}
        isLoading={loading}
        emptyMessage="No consultations match your filters."
        getRowKey={(order) => order.id}
        onRowClick={(order) => navigate(`/doctor/consultations/${order.id}?tab=patient`)}
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
        isLoading={loading}
      />
    </div>
  );
}
