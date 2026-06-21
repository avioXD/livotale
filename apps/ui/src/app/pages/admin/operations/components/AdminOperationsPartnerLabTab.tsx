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
  LAB_DISPATCH_STATUS_PRESETS,
  LAB_AI_STATUS_PRESETS,
} from '@/app/pages/admin/operations/adminOperationsConfig';
import { useLabReportsStore } from '@/store';
import type { AIExtractionStatus } from '@/types/aiExtraction';
import type { LabReportQueueRow } from '@/types/labReport';
import { orgPath } from '@/app/config/orgRoutes';
import { countActiveFilters } from '@/utils/listFilters';
import { useStorePaged } from '@/hooks/useStorePaged';
import { SAMPLE_DISPATCH_LABELS } from '@/types/sampleDispatch';
import type { TableColumn } from '@/types';

const DISPATCH_STAGE_LABELS: Record<LabReportQueueRow['dispatchStatus'], string> = {
  ...SAMPLE_DISPATCH_LABELS,
  not_started: 'Lab not assigned',
  sample_collected: 'Blood sample collected',
};

const AI_STATUS_LABELS: Record<AIExtractionStatus, string> = {
  not_started: 'Not started',
  queued: 'Queued',
  processing: 'Processing',
  extracted: 'Extracted',
  review_pending: 'Pending review',
  verified: 'Verified',
  failed: 'Failed',
  reupload_required: 'Re-upload required',
};

function readFilterParam(params: URLSearchParams, key: string): string {
  return params.get(key) ?? '';
}

interface AdminOperationsPartnerLabTabProps {
  defaultExtractionStatus?: string;
  focusAiReview?: boolean;
}

export function AdminOperationsPartnerLabTab({
  defaultExtractionStatus = '',
  focusAiReview = false,
}: AdminOperationsPartnerLabTabProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const queue = useLabReportsStore((s) => s.queue);
  const searchInput = useLabReportsStore((s) => s.searchInput);
  const draftDispatch = useLabReportsStore((s) => s.draftDispatch);
  const draftLab = useLabReportsStore((s) => s.draftLab);
  const draftAi = useLabReportsStore((s) => s.draftAi);
  const appliedDispatch = useLabReportsStore((s) => s.appliedDispatch);
  const appliedLab = useLabReportsStore((s) => s.appliedLab);
  const appliedAi = useLabReportsStore((s) => s.appliedAi);
  const appliedSearch = useLabReportsStore((s) => s.appliedSearch);
  const pageSize = useLabReportsStore((s) => s.pageSize);
  const filtersExpanded = useLabReportsStore((s) => s.filtersExpanded);
  const isLoading = useLabReportsStore((s) => s.isLoading);
  const error = useLabReportsStore((s) => s.error);
  const partnerLabs = useLabReportsStore((s) => s.partnerLabs);

  const setSearchInput = useLabReportsStore((s) => s.setSearchInput);
  const setDraftDispatch = useLabReportsStore((s) => s.setDraftDispatch);
  const setDraftLab = useLabReportsStore((s) => s.setDraftLab);
  const setDraftAi = useLabReportsStore((s) => s.setDraftAi);
  const applyFilters = useLabReportsStore((s) => s.applyFilters);
  const resetFilters = useLabReportsStore((s) => s.resetFilters);
  const setPage = useLabReportsStore((s) => s.setPage);
  const setPageSize = useLabReportsStore((s) => s.setPageSize);
  const setFiltersExpanded = useLabReportsStore((s) => s.setFiltersExpanded);
  const fetchQueue = useLabReportsStore((s) => s.fetchQueue);

  useEffect(() => {
    const dispatch =
      readFilterParam(searchParams, 'status') || readFilterParam(searchParams, 'dispatchStatus');
    const lab = readFilterParam(searchParams, 'labId');
    const ai = readFilterParam(searchParams, 'extractionStatus') || defaultExtractionStatus;
    useLabReportsStore.setState({
      draftDispatch: dispatch,
      appliedDispatch: dispatch,
      draftLab: lab,
      appliedLab: lab,
      draftAi: ai,
      appliedAi: ai,
      page: 1,
    });
    void fetchQueue();
  }, [searchParams, defaultExtractionStatus, fetchQueue]);

  const paged = useStorePaged(
    useLabReportsStore,
    (s) => ({ items: s.queue, page: s.page, pageSize: s.pageSize }),
    (s) => s.setPage,
  );
  const defaultLabFilters = useMemo(
    () => ({ dispatch: '', lab: '', ai: defaultExtractionStatus }),
    [defaultExtractionStatus],
  );
  const activeFilterCount = countActiveFilters(
    { dispatch: appliedDispatch, lab: appliedLab, ai: appliedAi },
    defaultLabFilters,
    appliedSearch,
  );

  const openOrderLabStep = useCallback(
    (orderId: string) => navigate(orgPath(`/admin/orders/${orderId}?step=lab`)),
    [navigate],
  );

  const labOptions = useMemo(() => {
    const fromQueue = [...new Set(queue.map((r) => r.partnerLabId).filter(Boolean))] as string[];
    const fromPartnerList = partnerLabs.map((l) => l.id);
    const ids = [...new Set([...fromQueue, ...fromPartnerList])];
    const nameById = new Map(partnerLabs.map((l) => [l.id, l.name]));
    return ids
      .map((id) => ({ id, name: nameById.get(id) ?? queue.find((r) => r.partnerLabId === id)?.partnerLabName ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [queue, partnerLabs]);

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    const dispatch = LAB_DISPATCH_STATUS_PRESETS.find((p) => p.value === appliedDispatch);
    if (dispatch?.value) labels.push(`Stage: ${dispatch.label}`);
    if (appliedLab) {
      const labName = labOptions.find((l) => l.id === appliedLab)?.name ?? appliedLab;
      labels.push(`Lab: ${labName}`);
    }
    const ai = LAB_AI_STATUS_PRESETS.find((p) => p.value === appliedAi);
    if (ai?.value) labels.push(`AI: ${ai.label}`);
    if (appliedSearch) labels.push(`Search: "${appliedSearch}"`);
    return labels;
  }, [appliedDispatch, appliedLab, appliedAi, appliedSearch, labOptions]);

  const columns: TableColumn<LabReportQueueRow>[] = useMemo(
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
        key: 'lab',
        header: 'Lab partner',
        render: (r) => r.partnerLabName ?? <span className="text-muted-foreground">Not assigned</span>,
      },
      {
        key: 'externalId',
        header: 'Lab portal ID',
        render: (r) =>
          r.pathologyExternalAppointmentId ? (
            <span className="font-mono text-xs">{r.pathologyExternalAppointmentId}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        key: 'visit',
        header: 'Visit',
        render: (r) => {
          if (r.pathologyVisitOutcome === 'visited') {
            return <StatusBadge status="verified" domain="aiExtraction" label="Visited" />;
          }
          if (r.pathologyVisitOutcome === 'no_show') {
            return <StatusBadge status="reupload_required" domain="aiExtraction" label="No-show" />;
          }
          return <span className="text-xs text-muted-foreground">Pending</span>;
        },
      },
      {
        key: 'status',
        header: focusAiReview ? 'AI status' : 'Stage',
        render: (r) =>
          focusAiReview && r.extractionStatus ? (
            <StatusBadge
              status={r.extractionStatus}
              domain="aiExtraction"
              label={AI_STATUS_LABELS[r.extractionStatus]}
            />
          ) : (
            <StatusBadge
              status={r.dispatchStatus}
              domain="sampleDispatch"
              label={DISPATCH_STAGE_LABELS[r.dispatchStatus]}
            />
          ),
      },
    ],
    [focusAiReview],
  );

  const handleApplyFilters = () => {
    applyFilters();
    const next = new URLSearchParams(searchParams);
    if (!focusAiReview) next.set('tab', 'partner-lab');
    const setOrDelete = (key: string, value: string) => {
      if (value) next.set(key, value);
      else next.delete(key);
    };
    setOrDelete('status', draftDispatch);
    setOrDelete('dispatchStatus', draftDispatch);
    setOrDelete('labId', draftLab);
    setOrDelete('extractionStatus', draftAi);
    setSearchParams(next, { replace: true });
  };

  const handleResetFilters = () => {
    resetFilters(defaultExtractionStatus);
    const next = new URLSearchParams(searchParams);
    if (!focusAiReview) next.set('tab', 'partner-lab');
    next.delete('status');
    next.delete('dispatchStatus');
    next.delete('labId');
    if (defaultExtractionStatus) next.set('extractionStatus', defaultExtractionStatus);
    else next.delete('extractionStatus');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {focusAiReview
          ? 'Pathology orders with AI extraction pending verification. Click a row to open the order lab report step.'
          : 'Lab partner workflow queue. Click a row to open the order lab report step — dispatch, PDF upload, AI review, and letterhead report live there.'}
      </p>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <ActiveFilterBanner labels={activeFilterLabels} onClear={handleResetFilters} />

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search order #, patient, or lab…"
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        isLoading={isLoading}
        filtersExpanded={filtersExpanded}
        onFiltersExpandedChange={setFiltersExpanded}
        activeFilterCount={activeFilterCount}
      >
        <FilterField label="Sample / PDF stage" htmlFor="ops-lab-dispatch">
          <select
            id="ops-lab-dispatch"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftDispatch}
            onChange={(e) => setDraftDispatch(e.target.value)}
          >
            {LAB_DISPATCH_STATUS_PRESETS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Lab partner" htmlFor="ops-lab-partner">
          <select
            id="ops-lab-partner"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftLab}
            onChange={(e) => setDraftLab(e.target.value)}
          >
            <option value="">All labs</option>
            {labOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="AI extraction" htmlFor="ops-lab-ai">
          <select
            id="ops-lab-ai"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftAi}
            onChange={(e) => setDraftAi(e.target.value)}
          >
            {LAB_AI_STATUS_PRESETS.map((o) => (
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
        emptyMessage="No lab report orders match filters."
        getRowKey={(r) => r.id}
        onRowClick={(r) => openOrderLabStep(r.orderId)}
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
