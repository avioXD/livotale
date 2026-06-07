import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DataTable,
  FilterField,
  ListToolbar,
  PaginationControls,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import type { AppointmentSummary } from '@/types';
import type { TableColumn } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';

interface StaffAppointmentsTablePanelProps {
  appointments: AppointmentSummary[];
  isLoading: boolean;
  detailPathPrefix?: string;
}

export function StaffAppointmentsTablePanel({
  appointments,
  isLoading,
  detailPathPrefix = '/appointments',
}: StaffAppointmentsTablePanelProps) {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const statusOptions = useMemo(
    () => [...new Set(appointments.map((a) => a.unified?.status ?? a.status))].sort(),
    [appointments],
  );

  const filtered = useMemo(() => {
    return appointments.filter((row) => {
      const status = row.unified?.status ?? row.status;
      if (appliedStatus && status !== appliedStatus) return false;
      if (!appliedSearch) return true;
      const hay = [
        row.unified?.appointmentCode,
        row.patientName,
        row.patientCode,
        row.typeName,
        row.visitType,
        status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(appliedSearch);
    });
  }, [appointments, appliedSearch, appliedStatus]);

  const paged = paginateList(filtered, page, pageSize);

  const columns: TableColumn<AppointmentSummary>[] = useMemo(
    () => [
      {
        key: 'code',
        header: 'Code',
        render: (r) => (
          <span className="font-medium">{r.unified?.appointmentCode ?? r.id.slice(0, 8)}</span>
        ),
      },
      {
        key: 'patient',
        header: 'Patient',
        render: (r) =>
          r.patientName ? (
            <span>
              {r.patientName}
              {r.patientCode ? ` · ${r.patientCode}` : ''}
            </span>
          ) : (
            '—'
          ),
      },
      {
        key: 'type',
        header: 'Type',
        render: (r) => r.typeName ?? r.visitType.replace(/_/g, ' '),
      },
      {
        key: 'when',
        header: 'When',
        render: (r) => {
          const when = r.unified?.scheduledStart ?? r.scheduledAt;
          return new Date(when).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          });
        },
      },
      {
        key: 'status',
        header: 'Status',
        render: (r) => {
          const status = r.unified?.status ?? r.status;
          return (
            <Badge variant="outline" className="capitalize">
              {status.replace(/_/g, ' ')}
            </Badge>
          );
        },
      },
      {
        key: 'payment',
        header: 'Payment',
        render: (r) => {
          const status = r.unified?.paymentStatus ?? r.paymentStatus;
          const amount = r.unified?.paymentAmount ?? r.paymentAmount;
          if (!status && amount == null) return '—';
          return (
            <span className="text-xs capitalize">
              {status ?? '—'}
              {amount != null ? ` · ₹${amount}` : ''}
            </span>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search code, patient, type…"
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
        <FilterField label="Status" htmlFor="staff-appt-status">
          <select
            id="staff-appt-status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftStatus}
            onChange={(e) => setDraftStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </FilterField>
      </ListToolbar>

      <DataTable
        columns={columns}
        data={paged.items}
        isLoading={isLoading}
        emptyMessage="No appointments in your caseload."
        getRowKey={(r) => r.id}
        onRowClick={(r) => navigate(`${detailPathPrefix}/${r.id}`)}
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
