import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AppointmentCard } from '@/app/pages/appointments/components/AppointmentCard';
import { CancelAppointmentDialog } from '@/app/pages/appointments/components/CancelAppointmentDialog';
import { RescheduleAppointmentDialog } from '@/app/pages/appointments/components/RescheduleAppointmentDialog';
import { useAppointmentsStore, useUserRole } from '@/store';
import { AppRole } from '@/types';

export function AppointmentsPage() {
  const navigate = useNavigate();
  const userRole = useUserRole();
  const isPatient = userRole === AppRole.PATIENT;
  const isStaff = !isPatient;

  const appointments = useAppointmentsStore((s) => s.appointments);
  const isLoading = useAppointmentsStore((s) => s.isLoading);
  const isSaving = useAppointmentsStore((s) => s.isSaving);
  const error = useAppointmentsStore((s) => s.error);
  const loadAppointments = useAppointmentsStore((s) => s.loadAppointments);

  const [cancelId, setCancelId] = useState<string | null>(null);
  const [rescheduleAppt, setRescheduleAppt] = useState<(typeof appointments)[number] | null>(null);

  useEffect(() => {
    void loadAppointments(isStaff);
  }, [loadAppointments, isStaff]);

  const upcoming = appointments.filter((a) => !['completed', 'cancelled'].includes(a.status));
  const past = appointments.filter((a) => ['completed', 'cancelled'].includes(a.status));
  const cancelTarget = cancelId ? appointments.find((a) => a.id === cancelId) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isPatient ? 'My Appointments' : 'Clinic Appointments'}
        description={
          isPatient
            ? 'Book home visits, clinic appointments, or teleconsultations and track progress.'
            : 'Upcoming and recent appointments for your patients.'
        }
        actions={
          isPatient ? (
            <Button onClick={() => navigate('/appointments/book')} className="gap-2">
              <FiPlus className="h-4 w-4" />
              Book now
            </Button>
          ) : undefined
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
              {isPatient
                ? 'No appointments yet. Book a home visit, clinic slot, or online consultation.'
                : 'No appointments in the last 7 days.'}
            </p>
            {isPatient && (
              <Button onClick={() => navigate('/appointments/book')} className="gap-2">
                <FiPlus className="h-4 w-4" />
                Book your first appointment
              </Button>
            )}
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
                    showPatient={isStaff}
                    onOpen={() => navigate(`/appointments/${appt.id}`)}
                    onReschedule={isPatient ? () => setRescheduleAppt(appt) : undefined}
                    onCancel={isPatient ? () => setCancelId(appt.id) : undefined}
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
                    showPatient={isStaff}
                    onOpen={() => navigate(`/appointments/${appt.id}`)}
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
          onDone={() => void loadAppointments(isStaff)}
        />
      )}

      {rescheduleAppt && (
        <RescheduleAppointmentDialog
          open={Boolean(rescheduleAppt)}
          appointment={rescheduleAppt}
          onClose={() => setRescheduleAppt(null)}
          onDone={() => void loadAppointments(isStaff)}
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
