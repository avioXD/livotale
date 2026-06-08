import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DataTable,
  FilterField,
  KpiCard,
  KpiGrid,
  kpiAccentAt,
  ListToolbar,
  PageHeader,
  PaginationControls,
} from '@/components/common';
import { RouteMapPanel } from '@/app/pages/technician/schedule/components/RouteMapPanel';
import { TechnicianRouteRequestPanel } from '@/app/pages/technician/schedule/components/TechnicianRouteRequestPanel';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sampleCollectionService } from '@/services/sampleCollection';
import { technicianAppointmentsService } from '@/services';
import type { SampleCollection } from '@/types/sampleCollection';
import type { TableColumn, TechnicianRouteResponse, TechnicianScheduleItem } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';

const TERMINAL_STATUSES = new Set([
  'published_to_patient',
  'cancelled',
  'failed',
  'completed',
]);

type SampleStatusFilter = 'all' | 'active' | 'completed' | 'failed';
type ClinicalStatusFilter = 'all' | 'pending' | 'in_progress' | 'completed';
type HomeVisitTab = 'clinical' | 'samples' | 'route';

function formatSampleAddress(row: SampleCollection): string {
  return [row.line1, row.line2, row.cityName, row.pincode].filter(Boolean).join(', ') || '—';
}

function formatClinicalAddress(row: TechnicianScheduleItem): string {
  return [row.line1, row.line2, row.cityName, row.pincode].filter(Boolean).join(', ') || '—';
}

function formatTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function TechnicianSchedulePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as HomeVisitTab | null;
  const activeTab: HomeVisitTab =
    tabParam === 'clinical' || tabParam === 'samples' || tabParam === 'route' ? tabParam : 'clinical';

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [samples, setSamples] = useState<SampleCollection[]>([]);
  const [clinicalVisits, setClinicalVisits] = useState<TechnicianScheduleItem[]>([]);
  const [route, setRoute] = useState<TechnicianRouteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftSampleStatus, setDraftSampleStatus] = useState<SampleStatusFilter>('all');
  const [appliedSampleStatus, setAppliedSampleStatus] = useState<SampleStatusFilter>('all');
  const [draftClinicalStatus, setDraftClinicalStatus] = useState<ClinicalStatusFilter>('all');
  const [appliedClinicalStatus, setAppliedClinicalStatus] = useState<ClinicalStatusFilter>('all');

  const [samplesPage, setSamplesPage] = useState(1);
  const [clinicalPage, setClinicalPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const setActiveTab = (tab: HomeVisitTab) => {
    setSearchParams(tab === 'clinical' ? {} : { tab });
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sampleItems, scheduleItems, routeData] = await Promise.all([
        sampleCollectionService.listTechnicianToday(date),
        technicianAppointmentsService.getSchedule(date),
        technicianAppointmentsService.getRoute(date),
      ]);
      setSamples(sampleItems);
      setClinicalVisits(scheduleItems);
      setRoute(routeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sample collections');
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSamplesPage(1);
    setClinicalPage(1);
  }, [date, appliedSearch, appliedSampleStatus, appliedClinicalStatus]);

  const applyFilters = () => {
    setAppliedSearch(searchInput.trim().toLowerCase());
    setAppliedSampleStatus(draftSampleStatus);
    setAppliedClinicalStatus(draftClinicalStatus);
  };

  const resetFilters = () => {
    setSearchInput('');
    setDraftSampleStatus('all');
    setDraftClinicalStatus('all');
    setAppliedSearch('');
    setAppliedSampleStatus('all');
    setAppliedClinicalStatus('all');
    setSamplesPage(1);
    setClinicalPage(1);
  };

  const filteredSamples = useMemo(() => {
    return samples.filter((row) => {
      if (appliedSampleStatus === 'active' && TERMINAL_STATUSES.has(row.status)) return false;
      if (appliedSampleStatus === 'completed' && !['completed', 'published_to_patient'].includes(row.status)) return false;
      if (appliedSampleStatus === 'failed' && row.status !== 'failed') return false;
      if (!appliedSearch) return true;
      const haystack = [
        row.patientName, row.patientCode, row.sampleCode, row.appointmentCode,
        row.line1, row.cityName, row.pincode, row.patientMobile, row.typeName,
        row.chiefComplaint, row.collectionRemarks,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(appliedSearch);
    });
  }, [samples, appliedSearch, appliedSampleStatus]);

  const filteredClinical = useMemo(() => {
    return clinicalVisits.filter((row) => {
      if (appliedClinicalStatus === 'pending' && !['booked', 'technician_assigned', 'confirmed', 'patient_confirmed'].includes(row.status)) return false;
      if (appliedClinicalStatus === 'in_progress' && !['technician_on_the_way', 'technician_arrived', 'sample_collected', 'consultation_started'].includes(row.status)) return false;
      if (appliedClinicalStatus === 'completed' && !['completed', 'closed', 'prescription_approved'].includes(row.status)) return false;
      if (!appliedSearch) return true;
      const haystack = [
        row.patientName, row.patientCode, row.appointmentCode, row.typeName,
        row.line1, row.cityName, row.pincode, row.chiefComplaint,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(appliedSearch);
    });
  }, [clinicalVisits, appliedSearch, appliedClinicalStatus]);

  const pagedSamples = paginateList(filteredSamples, samplesPage, pageSize);
  const pagedClinical = paginateList(filteredClinical, clinicalPage, pageSize);

  const activeSamples = samples.filter((v) => !TERMINAL_STATUSES.has(v.status)).length;
  const inProgressClinical = clinicalVisits.filter((v) =>
    ['technician_on_the_way', 'technician_arrived', 'sample_collected'].includes(v.status),
  ).length;

  const sampleColumns: TableColumn<SampleCollection>[] = [
    {
      key: 'time',
      header: 'Time',
      className: 'whitespace-nowrap',
      render: (row) => (
        <div>
          <p>{formatTime(row.scheduledStart)}</p>
          <p className="text-xs text-muted-foreground">
            {row.scheduledEnd ? `– ${formatTime(row.scheduledEnd)}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => (
        <div>
          <p className="font-medium">{row.patientName ?? 'Patient'}</p>
          <p className="text-xs text-muted-foreground">
            {[row.patientCode, row.patientMobile].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      render: (row) => (
        <p className="max-w-[180px] truncate text-sm text-muted-foreground" title={formatSampleAddress(row)}>
          {formatSampleAddress(row)}
        </p>
      ),
    },
    {
      key: 'sample',
      header: 'Sample ID',
      render: (row) => (
        <div>
          <p className="font-mono text-xs">{row.sampleCode}</p>
          <p className="text-xs text-muted-foreground">{row.typeName ?? 'Sample collection'}</p>
        </div>
      ),
    },
    {
      key: 'collection',
      header: 'Collection',
      render: (row) => (
        <div className="text-xs text-muted-foreground">
          <p>{row.sampleType ?? '—'}</p>
          <p>
            {[row.tubesCount != null ? `${row.tubesCount} tubes` : null, row.fastingStatus]
              .filter(Boolean)
              .join(' · ') || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Sample status',
      render: (row) => (
        <Badge variant="secondary" className="capitalize">
          {row.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
  ];

  const clinicalColumns: TableColumn<TechnicianScheduleItem>[] = [
    {
      key: 'time',
      header: 'Time',
      className: 'whitespace-nowrap',
      render: (row) => (
        <div>
          <p>{formatTime(row.scheduledStart)}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(row.scheduledStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => (
        <div>
          <p className="font-medium">{row.patientName}</p>
          <p className="text-xs text-muted-foreground">{row.patientCode ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      render: (row) => (
        <p className="max-w-[180px] truncate text-sm text-muted-foreground" title={formatClinicalAddress(row)}>
          {formatClinicalAddress(row)}
        </p>
      ),
    },
    {
      key: 'visit',
      header: 'Visit type',
      render: (row) => (
        <div>
          <p className="text-sm">{row.typeName}</p>
          <p className="font-mono text-xs text-muted-foreground">{row.appointmentCode}</p>
        </div>
      ),
    },
    {
      key: 'complaint',
      header: 'Complaint',
      render: (row) => (
        <p className="max-w-[140px] truncate text-sm text-muted-foreground" title={row.chiefComplaint ?? ''}>
          {row.chiefComplaint ?? '—'}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Visit status',
      render: (row) => (
        <Badge variant="secondary" className="capitalize">
          {row.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
  ];

  const openDetail = (appointmentId: string, tab?: 'clinical' | 'samples') => {
    const query = tab === 'samples' ? '?tab=samples' : '';
    navigate(`/technician/schedule/${appointmentId}${query}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sample collection"
        description="Clinical work, sample collection workflow, and route planning — click any row to open the full visit detail."
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <KpiGrid cols="three" className="xl:grid-cols-3">
        {[
          { label: 'Scheduled today', value: clinicalVisits.length },
          { label: 'Active samples', value: activeSamples },
          { label: 'In progress', value: inProgressClinical },
        ].map((kpi, i) => (
          <KpiCard key={kpi.label} {...kpi} accent={kpiAccentAt(i)} />
        ))}
      </KpiGrid>

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search patient, address, sample ID, complaint…"
        onApplyFilters={applyFilters}
        onResetFilters={resetFilters}
        isLoading={isLoading}
      >
        <FilterField label="Date" htmlFor="home-date">
          <Input id="home-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FilterField>
        <FilterField label="Sample status" htmlFor="home-sample-status">
          <select
            id="home-sample-status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftSampleStatus}
            onChange={(e) => setDraftSampleStatus(e.target.value as SampleStatusFilter)}
          >
            <option value="all">All samples</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </FilterField>
        <FilterField label="Visit status" htmlFor="home-clinical-status">
          <select
            id="home-clinical-status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftClinicalStatus}
            onChange={(e) => setDraftClinicalStatus(e.target.value as ClinicalStatusFilter)}
          >
            <option value="all">All visits</option>
            <option value="pending">Pending / assigned</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </FilterField>
      </ListToolbar>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HomeVisitTab)} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="clinical">Clinical ({filteredClinical.length})</TabsTrigger>
          <TabsTrigger value="samples">Sample collection ({filteredSamples.length})</TabsTrigger>
          <TabsTrigger value="route">Route ({route?.stops.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="clinical" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Consent, vitals, Liver Fibrosis Scan, and visit status — same home appointment, clinical view.
          </p>
          <DataTable
            columns={clinicalColumns}
            data={pagedClinical.items}
            isLoading={isLoading}
            emptyMessage="No clinical visits for this date."
            getRowKey={(row) => row.appointmentId}
            onRowClick={(row) => openDetail(row.appointmentId, 'clinical')}
          />
          <PaginationControls
            page={pagedClinical.page}
            pageSize={pageSize}
            total={pagedClinical.total}
            totalPages={pagedClinical.totalPages}
            onPageChange={setClinicalPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setClinicalPage(1);
              setSamplesPage(1);
            }}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="samples" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            LGSC sample IDs, collection status, photos, and lab handover.
          </p>
          <DataTable
            columns={sampleColumns}
            data={pagedSamples.items}
            isLoading={isLoading}
            emptyMessage="No sample collections for this date."
            getRowKey={(row) => row.id}
            onRowClick={(row) => openDetail(row.appointmentId, 'samples')}
          />
          <PaginationControls
            page={pagedSamples.page}
            pageSize={pageSize}
            total={pagedSamples.total}
            totalPages={pagedSamples.totalPages}
            onPageChange={setSamplesPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setClinicalPage(1);
              setSamplesPage(1);
            }}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="route" className="mt-4 space-y-4">
          <TechnicianRouteRequestPanel date={date} onAssigned={() => void load()} />
          <RouteMapPanel route={route} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
