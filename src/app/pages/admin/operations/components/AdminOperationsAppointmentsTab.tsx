import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DataTable,
  FilterField,
  ListToolbar,
  PaginationControls,
} from '@/components/common';
import { CONSULTATION_QUEUE_STAGE_PRESETS } from '@/app/pages/admin/operations/adminOperationsConfig';
import { Badge } from '@/components/ui/badge';
import { consultationOpsService } from '@/services/liverCare';
import { CONSULTATION_STAGE_LABELS } from '@/services/liverCare/consultation.queue';
import type { ConsultationQueueRow, ConsultationQueueStage } from '@/types/consultationQueue';
import type { TableColumn } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';

function readFilterParam(params: URLSearchParams, key: string): string {
  return params.get(key) ?? '';
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function stageBadgeVariant(stage: ConsultationQueueStage): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (stage === 'prescription_ready' || stage === 'completed') return 'secondary';
  if (stage === 'awaiting_doctor' || stage === 'doctor_assigned') return 'default';
  return 'outline';
}

export function AdminOperationsAppointmentsTab() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [queue, setQueue] = useState<ConsultationQueueRow[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftStage, setDraftStage] = useState(readFilterParam(searchParams, 'stage'));
  const [appliedStage, setAppliedStage] = useState(readFilterParam(searchParams, 'stage'));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const openOrderConsultStep = useCallback(
    (orderId: string) => navigate(`/admin/orders/${orderId}?step=consultation`),
    [navigate],
  );

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setQueue(
        await consultationOpsService.listConsultationQueue({
          search: appliedSearch || undefined,
          stage: appliedStage || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load consultations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [appliedSearch, appliedStage]);

  const paged = paginateList(queue, page, pageSize);

  const columns: TableColumn<ConsultationQueueRow>[] = useMemo(
    () => [
      {
        key: 'order',
        header: 'Order',
        render: (r) => (
          <div>
            <p className="font-medium">{r.orderNumber}</p>
            <p className="text-xs text-muted-foreground">{r.packageCode}</p>
          </div>
        ),
      },
      {
        key: 'patient',
        header: 'Patient',
        render: (r) => <span>{r.patientName}</span>,
      },
      {
        key: 'doctor',
        header: 'Doctor',
        render: (r) => r.doctorName ?? <span className="text-muted-foreground">Not assigned</span>,
      },
      {
        key: 'when',
        header: 'Consultation',
        render: (r) => formatDateTime(r.consultationScheduledAt),
      },
      {
        key: 'stage',
        header: 'Stage',
        render: (r) => (
          <Badge variant={stageBadgeVariant(r.stage)}>{CONSULTATION_STAGE_LABELS[r.stage]}</Badge>
        ),
      },
    ],
    [],
  );

  const applyFilters = () => {
    setAppliedSearch(searchInput.trim().toLowerCase());
    setAppliedStage(draftStage);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'appointments');
    if (draftStage) next.set('stage', draftStage);
    else next.delete('stage');
    next.delete('status');
    setSearchParams(next, { replace: true });
  };

  const resetFilters = () => {
    setSearchInput('');
    setDraftStage('');
    setAppliedSearch('');
    setAppliedStage('');
    setPage(1);
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'appointments');
    next.delete('stage');
    next.delete('status');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        PKG-3 consultation orders. Click a row to open the order consultation step — assign a doctor, pick a
        date and slot, and view the doctor&apos;s prescription when published.
      </p>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search order #, patient, or doctor…"
        onApplyFilters={applyFilters}
        onResetFilters={resetFilters}
      >
        <FilterField label="Stage" htmlFor="ops-consult-stage">
          <select
            id="ops-consult-stage"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftStage}
            onChange={(e) => setDraftStage(e.target.value)}
          >
            {CONSULTATION_QUEUE_STAGE_PRESETS.map((o) => (
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
        emptyMessage="No consultation orders match filters."
        getRowKey={(r) => r.id}
        onRowClick={(r) => openOrderConsultStep(r.orderId)}
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
