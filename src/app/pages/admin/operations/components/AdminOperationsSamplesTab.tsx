import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import {
  DataTable,
  FilterField,
  ListToolbar,
  PaginationControls,
} from '@/components/common';
import { AdminSampleCollectionDetailPanel } from '@/app/pages/admin/operations/components/AdminSampleCollectionDetailPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { opsAnalyticsService } from '@/services/opsAnalytics/OpsAnalyticsService';
import { sampleCollectionService } from '@/services/sampleCollection';
import type { AdminSampleCollectionUpdate, SampleCollection, StaffLabPartnerProfile, StaffTechnicianProfile } from '@/types/sampleCollection';
import type { TableColumn } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';

const SAMPLE_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending_technician_assignment', label: 'Pending assignment' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'travel_started', label: 'In transit' },
  { value: 'sample_collected', label: 'Collected' },
  { value: 'handed_over_to_lab', label: 'At lab' },
  { value: 'published_to_patient', label: 'Published' },
];

export function AdminOperationsSamplesTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sampleId = searchParams.get('sampleId');

  const [samples, setSamples] = useState<SampleCollection[]>([]);
  const [selected, setSelected] = useState<SampleCollection | null>(null);
  const [technicians, setTechnicians] = useState<StaffTechnicianProfile[]>([]);
  const [labPartners, setLabPartners] = useState<StaffLabPartnerProfile[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingDemo, setUsingDemo] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await sampleCollectionService.listAdmin({
        status: appliedStatus || undefined,
        limit: 200,
      });
      setSamples(data);
      setUsingDemo(data.length > 0 && data[0]?.id.startsWith('demo-'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load samples');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [appliedStatus]);

  useEffect(() => {
    void Promise.all([
      opsAnalyticsService.listTechnicians(),
      opsAnalyticsService.listLabPartners(),
    ]).then(([techs, labs]) => {
      setTechnicians(techs);
      setLabPartners(labs);
    });
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setIsDetailLoading(true);
    setError(null);
    try {
      setSelected(await sampleCollectionService.getAdminById(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load detail');
      setSelected(null);
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sampleId) {
      void loadDetail(sampleId);
    } else {
      setSelected(null);
    }
  }, [sampleId, loadDetail]);

  const openDetail = (row: SampleCollection) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', 'samples');
    params.set('sampleId', row.id);
    setSearchParams(params, { replace: false });
  };

  const closeDetail = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('sampleId');
    setSearchParams(params, { replace: false });
  };

  const filtered = useMemo(() => {
    if (!appliedSearch) return samples;
    return samples.filter((s) => {
      const hay = [s.sampleCode, s.patientName, s.pincode, s.status, s.technicianName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(appliedSearch);
    });
  }, [samples, appliedSearch]);

  const paged = paginateList(filtered, page, pageSize);

  const columns: TableColumn<SampleCollection>[] = useMemo(
    () => [
      { key: 'code', header: 'Sample ID', render: (r) => <span className="font-medium">{r.sampleCode}</span> },
      { key: 'patient', header: 'Patient', render: (r) => r.patientName ?? '—' },
      { key: 'pincode', header: 'Pincode', render: (r) => r.pincode ?? '—' },
      {
        key: 'status',
        header: 'Status',
        render: (r) => (
          <Badge variant="outline" className="capitalize">
            {r.status.replace(/_/g, ' ')}
          </Badge>
        ),
      },
      { key: 'tech', header: 'Technician', render: (r) => r.technicianName ?? '—' },
      {
        key: 'scheduled',
        header: 'Scheduled',
        render: (r) =>
          r.scheduledStart
            ? new Date(r.scheduledStart).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
            : '—',
      },
    ],
    [],
  );

  const saveDetails = async (payload: AdminSampleCollectionUpdate) => {
    if (!selected) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await sampleCollectionService.updateAdminDetails(selected.id, payload);
      setSelected(updated);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const assign = async (technicianId: string) => {
    if (!selected || !technicianId) return;
    setIsSaving(true);
    setError(null);
    try {
      const tech = technicians.find((t) => t.id === technicianId);
      const updated = await sampleCollectionService.assignTechnician(selected.id, technicianId);
      setSelected({
        ...updated,
        technicianName: tech?.fullName ?? updated.technicianName,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setIsSaving(false);
    }
  };

  if (sampleId) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={closeDetail}>
            <FiArrowLeft className="h-4 w-4" />
            Back to sample list
          </Button>
          {selected && (
            <div>
              <p className="font-mono text-lg font-semibold">{selected.sampleCode}</p>
              <p className="text-sm text-muted-foreground">
                {selected.patientName ?? 'Patient'}
                {selected.pincode ? ` · ${selected.pincode}` : ''}
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {isDetailLoading && !selected ? (
          <p className="text-sm text-muted-foreground">Loading sample details…</p>
        ) : selected ? (
          <AdminSampleCollectionDetailPanel
            sample={selected}
            technicians={technicians}
            labPartners={labPartners}
            isSaving={isSaving || isDetailLoading}
            onSave={(payload) => void saveDetails(payload)}
            onAssign={(techId) => void assign(techId)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Sample not found.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Sample collection requests — click a row to open full order details on this page.
        </p>
        <Button size="sm" variant="outline" asChild>
          <Link to="/admin/appointments/book">Create via walk-in book</Link>
        </Button>
      </div>

      {usingDemo && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Demo sample collections — run migration 027 and <code className="text-xs">npm run seed:sample-demo</code> on the API for live data.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search sample ID, patient, pincode…"
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
        <FilterField label="Status" htmlFor="ops-sample-status">
          <select
            id="ops-sample-status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftStatus}
            onChange={(e) => setDraftStatus(e.target.value)}
          >
            {SAMPLE_STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FilterField>
      </ListToolbar>

      <DataTable
        columns={columns}
        data={paged.items}
        isLoading={isLoading}
        emptyMessage="No sample collections found."
        getRowKey={(r) => r.id}
        onRowClick={(r) => openDetail(r)}
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
