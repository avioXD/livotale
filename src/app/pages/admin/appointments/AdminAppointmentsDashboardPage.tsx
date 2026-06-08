import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KpiCard, KpiGrid, kpiAccentAt } from '@/components/common';
import { useAdminAppointmentsStore } from '@/store';

export function AdminAppointmentsDashboardPage() {
  const dashboard = useAdminAppointmentsStore((s) => s.dashboard);
  const appointments = useAdminAppointmentsStore((s) => s.appointments);
  const isLoading = useAdminAppointmentsStore((s) => s.isLoading);
  const isSaving = useAdminAppointmentsStore((s) => s.isSaving);
  const error = useAdminAppointmentsStore((s) => s.error);
  const loadDashboard = useAdminAppointmentsStore((s) => s.loadDashboard);
  const loadAppointments = useAdminAppointmentsStore((s) => s.loadAppointments);
  const assignStaff = useAdminAppointmentsStore((s) => s.assignStaff);
  const sendReminder = useAdminAppointmentsStore((s) => s.sendReminder);

  const [statusFilter, setStatusFilter] = useState('');
  const [assignId, setAssignId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState('');
  const [technicianId, setTechnicianId] = useState('');

  useEffect(() => {
    void loadDashboard();
    void loadAppointments();
  }, [loadDashboard, loadAppointments]);

  const rows = statusFilter
    ? appointments.filter((row) => row.status === statusFilter)
    : appointments;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations dashboard"
        description="Daily clinic KPIs, staff assignment, and manual reminders."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link to="/admin/appointments/book">Book walk-in</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/appointments/routes">Route monitor</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/appointments/missed">Missed queue</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/appointments/analytics">Analytics</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/appointments/notifications">Notification log</Link>
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
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Appointments</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="status-filter" className="sr-only">Status</Label>
            <Input
              id="status-filter"
              placeholder="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-48"
            />
            <Button variant="outline" size="sm" onClick={() => void loadAppointments(statusFilter ? { status: statusFilter } : {})}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Patient</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">When</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-3 pr-3 font-medium">{row.appointmentCode}</td>
                      <td className="py-3 pr-3">
                        <Link
                          to={`/patients/${row.patientId}`}
                          className="font-medium text-livotale-pink hover:underline"
                        >
                          {row.patientName}
                        </Link>
                      </td>
                      <td className="py-3 pr-3">{row.typeName}</td>
                      <td className="py-3 pr-3">
                        {new Date(row.scheduledStart).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant="outline" className="capitalize">
                          {row.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" asChild>
                            <Link to={`/admin/appointments/${row.id}`}>View</Link>
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setAssignId(row.id)}>
                            Assign
                          </Button>
                          <Button size="sm" variant="ghost" disabled={isSaving} onClick={() => void sendReminder(row.id)}>
                            Remind
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
