import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { AppointmentCard } from '@/app/pages/appointments/components/AppointmentCard';
import { CancelAppointmentDialog } from '@/app/pages/appointments/components/CancelAppointmentDialog';
import { RescheduleAppointmentDialog } from '@/app/pages/appointments/components/RescheduleAppointmentDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppointmentsStore, useUserRole } from '@/store';
import { AppRole } from '@/types';
import { orgPath } from '@/app/config/orgRoutes';

const ADMIN_OPS_ROLES = new Set<AppRole>([
  AppRole.OPERATIONS,
  AppRole.CITY_MANAGER,
  AppRole.SUPER_ADMIN,
]);

export function AppointmentsPage() {
  const navigate = useNavigate();
  const userRole = useUserRole();
  const isPatient = userRole === AppRole.PATIENT;

  const appointments = useAppointmentsStore((s) => s.appointments);
  const isLoading = useAppointmentsStore((s) => s.isLoading);
  const isSaving = useAppointmentsStore((s) => s.isSaving);
  const error = useAppointmentsStore((s) => s.error);
  const loadAppointments = useAppointmentsStore((s) => s.loadAppointments);

  const [cancelId, setCancelId] = useState<string | null>(null);
  const [rescheduleAppt, setRescheduleAppt] = useState<(typeof appointments)[number] | null>(null);

  useEffect(() => {
    if (!isPatient) return;
    void loadAppointments(false);
  }, [loadAppointments, isPatient]);

  if (userRole === AppRole.DOCTOR) {
    return <Navigate to={orgPath('/doctor/appointments')} replace />;
  }

  if (userRole && ADMIN_OPS_ROLES.has(userRole)) {
    return <Navigate to={orgPath('/admin/operations?tab=appointments')} replace />;
  }

  if (userRole && !isPatient) {
    return <Navigate to={orgPath('/dashboard')} replace />;
  }

  const upcoming = appointments.filter((a) => !['completed', 'cancelled'].includes(a.status));
  const past = appointments.filter((a) => ['completed', 'cancelled'].includes(a.status));
  const cancelTarget = cancelId ? appointments.find((a) => a.id === cancelId) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Appointments"
        description="Book home visits, clinic appointments, or teleconsultations and track progress."
        actions={
          <Button onClick={() => navigate(orgPath('/appointments/book'))} className="gap-2">
            <FiPlus className="h-4 w-4" />
            Book now
          </Button>
        }
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading appointments…</p>
      ) : appointments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">
              No appointments yet. Book a home visit, clinic slot, or online consultation.
            </p>
            <Button onClick={() => navigate(orgPath('/appointments/book'))} className="gap-2">
              <FiPlus className="h-4 w-4" />
              Book your first appointment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Upcoming ({upcoming.length})
              </h3>
              <div className="grid gap-4 lg:grid-cols-2">
                {upcoming.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    showPatient={false}
                    onOpen={() => navigate(orgPath(`/appointments/${appt.id}`))}
                    onReschedule={() => setRescheduleAppt(appt)}
                    onCancel={() => setCancelId(appt.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Past ({past.length})
              </h3>
              <div className="grid gap-4 lg:grid-cols-2">
                {past.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    showPatient={false}
                    onOpen={() => navigate(orgPath(`/appointments/${appt.id}`))}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {cancelTarget && (
        <CancelAppointmentDialog
          open={Boolean(cancelId)}
          appointmentId={cancelTarget.id}
          onClose={() => setCancelId(null)}
          onDone={() => void loadAppointments(false)}
        />
      )}

      {rescheduleAppt && (
        <RescheduleAppointmentDialog
          open={Boolean(rescheduleAppt)}
          appointment={rescheduleAppt}
          onClose={() => setRescheduleAppt(null)}
          onDone={() => void loadAppointments(false)}
        />
      )}

      {isSaving && (
        <p className="fixed bottom-4 right-4 rounded-full bg-foreground px-4 py-2 text-xs text-background shadow-lg">
          Updating appointment…
        </p>
      )}
    </div>
  );
}
