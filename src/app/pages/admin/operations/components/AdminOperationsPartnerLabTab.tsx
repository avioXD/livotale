import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DataTable,
  FilterField,
  ListToolbar,
  PaginationControls,
} from '@/components/common';
import {
  LAB_AI_STATUS_PRESETS,
  LAB_DISPATCH_STATUS_PRESETS,
} from '@/app/pages/admin/operations/adminOperationsConfig';
import { Badge } from '@/components/ui/badge';
import { useLabReportsStore } from '@/store';
import type { AIExtractionStatus } from '@/types/aiExtraction';
import type { LabReportQueueRow } from '@/types/labReport';
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

function dispatchBadgeVariant(status: LabReportQueueRow['dispatchStatus']) {
  if (status === 'awaiting_report') return 'default' as const;
  if (status === 'report_uploaded') return 'secondary' as const;
  return 'outline' as const;
}

function aiBadgeVariant(status: AIExtractionStatus | null) {
  if (status === 'review_pending') return 'default' as const;
  if (status === 'verified') return 'secondary' as const;
  if (status === 'failed' || status === 'reupload_required') return 'destructive' as const;
  return 'outline' as const;
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
  const page = useLabReportsStore((s) => s.page);
  const pageSize = useLabReportsStore((s) => s.pageSize);
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
  const getPagedQueue = useLabReportsStore((s) => s.getPagedQueue);
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
    });
    void fetchQueue();
  }, [searchParams, defaultExtractionStatus, fetchQueue]);

  const paged = getPagedQueue();

  const openOrderLabStep = useCallback(
    (orderId: string) => navigate(`/admin/orders/${orderId}?step=lab`),
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
        key: 'status',
        header: focusAiReview ? 'AI status' : 'Stage',
        render: (r) =>
          focusAiReview && r.extractionStatus ? (
            <Badge variant={aiBadgeVariant(r.extractionStatus)}>
              {AI_STATUS_LABELS[r.extractionStatus]}
            </Badge>
          ) : (
            <Badge variant={dispatchBadgeVariant(r.dispatchStatus)}>
              {DISPATCH_STAGE_LABELS[r.dispatchStatus]}
            </Badge>
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

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search order #, patient, or lab…"
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
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
      />
    </div>
  );
}
