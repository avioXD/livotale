import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DataTable,
  FilterField,
  ListToolbar,
  PaginationControls,
} from '@/components/common';
import { APPOINTMENT_LIST_FILTERS } from '@/app/pages/doctor/doctorHubConfig';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DoctorAppointmentSummary } from '@/types';
import type { TableColumn } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';

interface DoctorAppointmentsListPanelProps {
  appointments: DoctorAppointmentSummary[];
  isLoading: boolean;
  listFilter: 'today' | 'upcoming' | 'completed' | 'missed';
  onFilterChange: (filter: 'today' | 'upcoming' | 'completed' | 'missed') => void;
  onSelect: (id: string) => void;
}

export function DoctorAppointmentsListPanel({
  appointments,
  isLoading,
  listFilter,
  onFilterChange,
  onSelect,
}: DoctorAppointmentsListPanelProps) {
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const statusOptions = useMemo(
    () => [...new Set(appointments.map((a) => a.status))].sort(),
    [appointments],
  );

  const filtered = useMemo(() => {
    return appointments.filter((row) => {
      if (appliedStatus && row.status !== appliedStatus) return false;
      if (!appliedSearch) return true;
      const hay = [
        row.appointmentCode,
        row.patientName,
        row.patientCode,
        row.typeName,
        row.chiefComplaint,
        row.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(appliedSearch);
    });
  }, [appointments, appliedSearch, appliedStatus]);

  const paged = paginateList(filtered, page, pageSize);

  const columns: TableColumn<DoctorAppointmentSummary>[] = useMemo(
    () => [
      { key: 'code', header: 'Code', render: (r) => <span className="font-medium">{r.appointmentCode}</span> },
      {
        key: 'patient',
        header: 'Patient',
        render: (r) => (
          <Link
            to={`/patients/${r.patientId}?tab=dashboard`}
            className="text-livotale-pink hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {r.patientName}
          </Link>
        ),
      },
      { key: 'type', header: 'Type', render: (r) => r.typeName },
      {
        key: 'when',
        header: 'Scheduled',
        render: (r) =>
          new Date(r.scheduledStart).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }),
      },
      {
        key: 'status',
        header: 'Status',
        render: (r) => (
          <Badge variant="outline" className="capitalize">
            {r.status.replace(/_/g, ' ')}
          </Badge>
        ),
      },
      {
        key: 'complaint',
        header: 'Complaint',
        render: (r) => (
          <span className="line-clamp-1 max-w-[200px] text-muted-foreground">
            {r.chiefComplaint ?? '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (r) => (
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onSelect(r.id); }}>
            Open
          </Button>
        ),
      },
    ],
    [onSelect],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {APPOINTMENT_LIST_FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={listFilter === f.value ? 'default' : 'outline'}
            onClick={() => onFilterChange(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search patient, code, complaint…"
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
        <FilterField label="Status" htmlFor="doc-appt-status">
          <select
            id="doc-appt-status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftStatus}
            onChange={(e) => setDraftStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </FilterField>
      </ListToolbar>

      <DataTable
        columns={columns}
        data={paged.items}
        isLoading={isLoading}
        emptyMessage="No appointments in this list."
        getRowKey={(r) => r.id}
        onRowClick={(r) => onSelect(r.id)}
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
