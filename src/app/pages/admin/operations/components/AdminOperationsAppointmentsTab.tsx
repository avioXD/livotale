import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  DataTable,
  FilterField,
  ListToolbar,
  PaginationControls,
} from '@/components/common';
import { APPOINTMENT_STATUS_PRESETS } from '@/app/pages/admin/operations/adminOperationsConfig';
import { RouteMonitoringPanel } from '@/app/pages/admin/operations/components/RouteMonitoringPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminAppointmentsStore } from '@/store';
import type { AdminAppointmentSummary } from '@/types';
import type { TableColumn } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';

export function AdminOperationsAppointmentsTab() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const appointments = useAdminAppointmentsStore((s) => s.appointments);
  const isLoading = useAdminAppointmentsStore((s) => s.isLoading);
  const isSaving = useAdminAppointmentsStore((s) => s.isSaving);
  const error = useAdminAppointmentsStore((s) => s.error);
  const loadAppointments = useAdminAppointmentsStore((s) => s.loadAppointments);
  const assignStaff = useAdminAppointmentsStore((s) => s.assignStaff);
  const sendReminder = useAdminAppointmentsStore((s) => s.sendReminder);

  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftStatus, setDraftStatus] = useState(searchParams.get('status') ?? '');
  const [appliedStatus, setAppliedStatus] = useState(searchParams.get('status') ?? '');
  const [draftType, setDraftType] = useState('');
  const [appliedType, setAppliedType] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState('');
  const [technicianId, setTechnicianId] = useState('');

  useEffect(() => {
    void loadAppointments(appliedStatus ? { status: appliedStatus } : {});
  }, [loadAppointments, appliedStatus]);

  const typeOptions = useMemo(
    () => [...new Set(appointments.map((a) => a.typeName))].sort(),
    [appointments],
  );

  const filtered = useMemo(() => {
    return appointments.filter((row) => {
      if (appliedType && row.typeName !== appliedType) return false;
      if (!appliedSearch) return true;
      const hay = [row.appointmentCode, row.patientName, row.typeName, row.status, row.doctorName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(appliedSearch);
    });
  }, [appointments, appliedSearch, appliedType]);

  const paged = paginateList(filtered, page, pageSize);

  const columns: TableColumn<AdminAppointmentSummary>[] = useMemo(
    () => [
      { key: 'code', header: 'Code', render: (r) => <span className="font-medium">{r.appointmentCode}</span> },
      {
        key: 'patient',
        header: 'Patient',
        render: (r) => (
          <Link to={`/patients/${r.patientId}`} className="text-livotel-pink hover:underline" onClick={(e) => e.stopPropagation()}>
            {r.patientName}
          </Link>
        ),
      },
      { key: 'type', header: 'Type', render: (r) => r.typeName },
      { key: 'doctor', header: 'Doctor', render: (r) => r.doctorName ?? '—' },
      {
        key: 'when',
        header: 'When',
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
        key: 'payment',
        header: 'Payment',
        render: (r) => (
          <span className="text-xs capitalize">
            {r.paymentStatus ?? '—'}
            {r.paymentAmount ? ` · ₹${r.paymentAmount}` : ''}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (r) => (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" onClick={() => setAssignId(r.id)}>Assign</Button>
            <Button size="sm" variant="ghost" disabled={isSaving} onClick={() => void sendReminder(r.id)}>Remind</Button>
          </div>
        ),
      },
    ],
    [isSaving, sendReminder],
  );

  const applyFilters = () => {
    setAppliedSearch(searchInput.trim().toLowerCase());
    setAppliedStatus(draftStatus);
    setAppliedType(draftType);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (draftStatus) next.set('status', draftStatus);
    else next.delete('status');
    setSearchParams(next, { replace: true });
  };

  const resetFilters = () => {
    setSearchInput('');
    setDraftStatus('');
    setDraftType('');
    setAppliedSearch('');
    setAppliedStatus('');
    setAppliedType('');
    setPage(1);
    const next = new URLSearchParams(searchParams);
    next.delete('status');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          All clinic appointments. Use status filter for missed/no-show — no separate queue needed.
        </p>
        <Button size="sm" asChild>
          <Link to="/admin/appointments/book">Book walk-in</Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <RouteMonitoringPanel />

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search code, patient, doctor…"
        onApplyFilters={applyFilters}
        onResetFilters={resetFilters}
      >
        <FilterField label="Status" htmlFor="ops-appt-status">
          <select
            id="ops-appt-status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftStatus}
            onChange={(e) => setDraftStatus(e.target.value)}
          >
            {APPOINTMENT_STATUS_PRESETS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Type" htmlFor="ops-appt-type">
          <select
            id="ops-appt-type"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftType}
            onChange={(e) => setDraftType(e.target.value)}
          >
            <option value="">All types</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </FilterField>
      </ListToolbar>

      <DataTable
        columns={columns}
        data={paged.items}
        isLoading={isLoading}
        emptyMessage="No appointments match filters."
        getRowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/admin/appointments/${r.id}`)}
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

      {assignId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border bg-card p-4 shadow-lg">
            <h3 className="font-medium">Assign staff</h3>
            <div className="mt-3 space-y-2">
              <input className="flex h-10 w-full rounded-md border px-3 text-sm" placeholder="Doctor ID" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} />
              <input className="flex h-10 w-full rounded-md border px-3 text-sm" placeholder="Technician ID" value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAssignId(null)}>Cancel</Button>
              <Button
                disabled={isSaving || (!doctorId.trim() && !technicianId.trim())}
                onClick={() =>
                  void assignStaff(assignId, {
                    doctorId: doctorId.trim() || undefined,
                    technicianId: technicianId.trim() || undefined,
                  }).then(() => {
                    setAssignId(null);
                    setDoctorId('');
                    setTechnicianId('');
                  })
                }
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
