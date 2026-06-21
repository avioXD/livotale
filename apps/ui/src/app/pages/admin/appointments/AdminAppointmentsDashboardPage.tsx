import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import {
  DataTable,
  FilterField,
  KpiCard,
  KpiGrid,
  ListToolbar,
  PaginationControls,
  kpiAccentAt,
} from '@/components/common';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_APPOINTMENTS_FILTERS,
  filterAppointments,
  useAdminAppointmentsStore,
} from '@/store';
import type { AdminAppointmentSummary, TableColumn } from '@/types';
import { orgPath } from '@/app/config/orgRoutes';
import { countActiveFilters } from '@/utils/listFilters';
import { useStorePaged } from '@/hooks/useStorePaged';

export function AdminAppointmentsDashboardPage() {
  const navigate = useNavigate();
  const {
    dashboard,
    searchInput,
    draftFilters,
    appliedFilters,
    appliedSearch,
    pageSize,
    filtersExpanded,
    isLoading,
    isSaving,
    error,
    loadDashboard,
    loadAppointments,
    assignStaff,
    sendReminder,
    setSearchInput,
    setDraftFilter,
    applyFilters,
    resetFilters,
    setPage,
    setPageSize,
    setFiltersExpanded,
  } = useAdminAppointmentsStore(
    useShallow((s) => ({
      dashboard: s.dashboard,
      searchInput: s.searchInput,
      draftFilters: s.draftFilters,
      appliedFilters: s.appliedFilters,
      appliedSearch: s.appliedSearch,
      pageSize: s.pageSize,
      filtersExpanded: s.filtersExpanded,
      isLoading: s.isLoading,
      isSaving: s.isSaving,
      error: s.error,
      loadDashboard: s.loadDashboard,
      loadAppointments: s.loadAppointments,
      assignStaff: s.assignStaff,
      sendReminder: s.sendReminder,
      setSearchInput: s.setSearchInput,
      setDraftFilter: s.setDraftFilter,
      applyFilters: s.applyFilters,
      resetFilters: s.resetFilters,
      setPage: s.setPage,
      setPageSize: s.setPageSize,
      setFiltersExpanded: s.setFiltersExpanded,
    })),
  );

  const [assignId, setAssignId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState('');
  const [technicianId, setTechnicianId] = useState('');

  useEffect(() => {
    void loadDashboard();
    void loadAppointments();
  }, [loadDashboard, loadAppointments]);

  const paged = useStorePaged(
    useAdminAppointmentsStore,
    (s) => ({
      items: filterAppointments(s.appointments, s.appliedSearch, s.appliedFilters),
      page: s.page,
      pageSize: s.pageSize,
    }),
    (s) => s.setPage,
  );
  const activeFilterCount = countActiveFilters(
    appliedFilters,
    DEFAULT_APPOINTMENTS_FILTERS,
    appliedSearch,
  );

  const columns: TableColumn<AdminAppointmentSummary>[] = useMemo(
    () => [
      {
        key: 'code',
        header: 'Code',
        render: (row) => <span className="font-medium">{row.appointmentCode}</span>,
      },
      {
        key: 'patient',
        header: 'Patient',
        render: (row) => (
          <Link
            to={orgPath(`/patients/${row.patientId}`)}
            className="font-medium text-livotale-pink hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.patientName}
          </Link>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        render: (row) => row.typeName,
      },
      {
        key: 'when',
        header: 'When',
        render: (row) =>
          new Date(row.scheduledStart).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <Badge variant="outline" className="capitalize">
            {row.status.replace(/_/g, ' ')}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (row) => (
          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="secondary" asChild>
              <Link to={orgPath(`/admin/appointments/${row.id}`)}>View</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAssignId(row.id)}>
              Assign
            </Button>
            <Button size="sm" variant="ghost" disabled={isSaving} onClick={() => void sendReminder(row.id)}>
              Remind
            </Button>
          </div>
        ),
      },
    ],
    [isSaving, sendReminder],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations dashboard"
        description="Daily clinic KPIs, staff assignment, and manual reminders."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link to={orgPath('/admin/appointments/book')}>Book walk-in</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={orgPath('/admin/appointments/routes')}>Route monitor</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={orgPath('/admin/appointments/missed')}>Missed queue</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={orgPath('/admin/appointments/analytics')}>Analytics</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={orgPath('/admin/appointments/notifications')}>Notification log</Link>
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {dashboard && (
        <KpiGrid cols="three">
          {[
            { label: "Today's appointments", value: dashboard.kpis.today_total },
            { label: 'Pending assignments', value: dashboard.kpis.pending_assignments },
            { label: 'Delayed technicians', value: dashboard.kpis.delayed_technicians },
            { label: 'Completed today', value: dashboard.kpis.completed_today },
            { label: 'Cancelled today', value: dashboard.kpis.cancelled_today },
            { label: 'Missed today', value: dashboard.kpis.missed_today },
          ].map((kpi, i) => (
            <KpiCard key={kpi.label} {...kpi} accent={kpiAccentAt(i)} />
          ))}
        </KpiGrid>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appointments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ListToolbar
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder="Search code, patient, type…"
            onApplyFilters={() => void applyFilters()}
            onResetFilters={() => void resetFilters()}
            isLoading={isLoading}
            filtersExpanded={filtersExpanded}
            onFiltersExpandedChange={setFiltersExpanded}
            activeFilterCount={activeFilterCount}
          >
            <FilterField label="Status" htmlFor="appt-filter-status">
              <input
                id="appt-filter-status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. scheduled"
                value={draftFilters.status}
                onChange={(e) => setDraftFilter('status', e.target.value)}
              />
            </FilterField>
          </ListToolbar>

          <DataTable
            columns={columns}
            data={paged.items}
            isLoading={isLoading}
            emptyMessage="No appointments for today."
            getRowKey={(row) => row.id}
            onRowClick={(row) => navigate(orgPath(`/admin/appointments/${row.id}`))}
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
        </CardContent>
      </Card>

      {assignId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-base">Assign staff</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="doctor-id">Doctor ID</Label>
                <Input id="doctor-id" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} placeholder="UUID" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tech-id">Technician ID</Label>
                <Input id="tech-id" value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} placeholder="UUID" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
