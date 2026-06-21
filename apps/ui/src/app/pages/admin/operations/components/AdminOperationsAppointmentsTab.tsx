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
import { Badge } from '@/components/ui/badge';
import { CONSULTATION_QUEUE_STAGE_PRESETS } from '@/app/pages/admin/operations/adminOperationsConfig';
import { CONSULTATION_STAGE_LABELS } from '@/services/liverCare/consultation.queue';
import { formatStatusLabel } from '@/utils/statusColors';
import {
  DEFAULT_OPS_APPOINTMENTS_FILTERS,
  useOpsAppointmentsStore,
} from '@/store/operations/opsAppointmentsStore';
import type { ConsultationQueueRow } from '@/types/consultationQueue';
import type { TableColumn } from '@/types';
import { orgPath } from '@/app/config/orgRoutes';
import { countActiveFilters } from '@/utils/listFilters';
import { useStorePaged } from '@/hooks/useStorePaged';

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AdminOperationsAppointmentsTab() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchInput = useOpsAppointmentsStore((s) => s.searchInput);
  const draftFilters = useOpsAppointmentsStore((s) => s.draftFilters);
  const appliedFilters = useOpsAppointmentsStore((s) => s.appliedFilters);
  const appliedSearch = useOpsAppointmentsStore((s) => s.appliedSearch);
  const pageSize = useOpsAppointmentsStore((s) => s.pageSize);
  const filtersExpanded = useOpsAppointmentsStore((s) => s.filtersExpanded);
  const isLoading = useOpsAppointmentsStore((s) => s.isLoading);
  const error = useOpsAppointmentsStore((s) => s.error);
  const syncFromUrl = useOpsAppointmentsStore((s) => s.syncFromUrl);
  const fetchItems = useOpsAppointmentsStore((s) => s.fetchItems);
  const setSearchInput = useOpsAppointmentsStore((s) => s.setSearchInput);
  const setDraftFilter = useOpsAppointmentsStore((s) => s.setDraftFilter);
  const applyFiltersStore = useOpsAppointmentsStore((s) => s.applyFilters);
  const resetFiltersStore = useOpsAppointmentsStore((s) => s.resetFilters);
  const setPage = useOpsAppointmentsStore((s) => s.setPage);
  const setPageSize = useOpsAppointmentsStore((s) => s.setPageSize);
  const setFiltersExpanded = useOpsAppointmentsStore((s) => s.setFiltersExpanded);

  const openOrderConsultStep = useCallback(
    (orderId: string) => navigate(orgPath(`/admin/orders/${orderId}?step=consultation`)),
    [navigate],
  );

  useEffect(() => {
    syncFromUrl(searchParams);
    void fetchItems();
  }, [searchParams, syncFromUrl, fetchItems]);

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    const stage = CONSULTATION_QUEUE_STAGE_PRESETS.find((p) => p.value === appliedFilters.stage);
    if (stage?.value) labels.push(`Stage: ${stage.label}`);
    if (appliedSearch) labels.push(`Search: "${appliedSearch}"`);
    return labels;
  }, [appliedFilters.stage, appliedSearch]);

  const paged = useStorePaged(
    useOpsAppointmentsStore,
    (s) => ({ items: s.items, page: s.page, pageSize: s.pageSize }),
    (s) => s.setPage,
  );
  const activeFilterCount = countActiveFilters(
    appliedFilters,
    DEFAULT_OPS_APPOINTMENTS_FILTERS,
    appliedSearch,
  );

  const applyFilters = () => {
    applyFiltersStore();
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'appointments');
    if (draftFilters.stage) next.set('stage', draftFilters.stage);
    else next.delete('stage');
    next.delete('status');
    setSearchParams(next, { replace: true });
  };

  const resetFilters = () => {
    resetFiltersStore();
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'appointments');
    next.delete('stage');
    next.delete('status');
    setSearchParams(next, { replace: true });
  };

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
        render: (r) => (
          <div className="space-y-1">
            <span>{formatDateTime(r.consultationScheduledAt)}</span>
            {r.consultationPatientPreferredAt && !r.consultationScheduledAt && (
              <Badge variant="outline" className="text-[10px]">
                Patient requested slot
              </Badge>
            )}
          </div>
        ),
      },
      {
        key: 'stage',
        header: 'Stage',
        render: (r) => (
          <StatusBadge
            status={r.stage}
            domain="consultationStage"
            label={CONSULTATION_STAGE_LABELS[r.stage] ?? formatStatusLabel(r.stage)}
          />
        ),
      },
    ],
    [],
  );

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

      <ActiveFilterBanner labels={activeFilterLabels} onClear={resetFilters} />

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search order #, patient, or doctor…"
        onApplyFilters={applyFilters}
        onResetFilters={resetFilters}
        isLoading={isLoading}
        filtersExpanded={filtersExpanded}
        onFiltersExpandedChange={setFiltersExpanded}
        activeFilterCount={activeFilterCount}
      >
        <FilterField label="Stage" htmlFor="ops-consult-stage">
          <select
            id="ops-consult-stage"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftFilters.stage}
            onChange={(e) => setDraftFilter('stage', e.target.value)}
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
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
      />
    </div>
  );
}
