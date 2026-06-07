import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCalendar, FiMapPin } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { AppointmentStatusStepper } from '@/app/pages/appointments/components/AppointmentStatusStepper';
import { AppointmentTimeline } from '@/app/pages/appointments/components/AppointmentTimeline';
import { CancelAppointmentDialog } from '@/app/pages/appointments/components/CancelAppointmentDialog';
import { RescheduleAppointmentDialog } from '@/app/pages/appointments/components/RescheduleAppointmentDialog';
import { AppointmentPrescriptionCard } from '@/app/pages/appointments/components/AppointmentPrescriptionCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppointmentsStore } from '@/store';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  booked: 'secondary',
  assigned: 'default',
  in_progress: 'default',
  completed: 'outline',
  cancelled: 'destructive',
  rescheduled: 'secondary',
  no_show: 'destructive',
};

function titleFor(appt: { typeName?: string; visitType: string; visitMode?: string }) {
  const name = appt.typeName ?? appt.visitType.replace(/_/g, ' ');
  const mode = appt.visitMode === 'tele' ? ' (Online)' : appt.visitMode === 'clinic' ? ' (Clinic)' : appt.visitMode === 'home' ? ' (Home)' : '';
  return `${name}${mode}`;
}

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const selected = useAppointmentsStore((s) => s.selected);
  const isLoading = useAppointmentsStore((s) => s.isLoading);
  const error = useAppointmentsStore((s) => s.error);
  const loadDetail = useAppointmentsStore((s) => s.loadDetail);
  const clearSelected = useAppointmentsStore((s) => s.clearSelected);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const trackableStatuses = new Set([
    'technician_assigned',
    'technician_on_the_way',
    'technician_arrived',
    'patient_confirmed',
  ]);
  const showTracking =
    selected &&
    (selected.visitMode === 'home' || selected.unified?.visitMode === 'home') &&
    trackableStatuses.has(selected.unified?.status ?? selected.status);

  const prescriptionReadyStatuses = new Set([
    'prescription_approved',
    'completed',
    'consultation_completed',
  ]);
  const showPrescription =
    selected &&
    prescriptionReadyStatuses.has(selected.unified?.status ?? selected.status);

  const showTeleJoin =
    selected &&
    (selected.visitMode === 'tele' || selected.unified?.visitMode === 'tele') &&
    !['cancelled_by_patient', 'cancelled_by_admin', 'cancelled_by_doctor', 'completed', 'closed'].includes(
      selected.unified?.status ?? selected.status,
    );

  useEffect(() => {
    if (!id) return;
    void loadDetail(id);
    return () => clearSelected();
  }, [id, loadDetail, clearSelected]);

  if (!id) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointment details"
        actions={
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/appointments')}>
            <FiArrowLeft className="h-4 w-4" />
            All appointments
          </Button>
        }
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading || !selected ? (
        <p className="text-sm text-muted-foreground">Loading appointment…</p>
      ) : (
        <>
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">{titleFor(selected)}</CardTitle>
                  {selected.unified?.appointmentCode && (
                    <p className="mt-1 text-sm text-muted-foreground">{selected.unified.appointmentCode}</p>
                  )}
                </div>
                <Badge variant={statusVariant[selected.status] ?? 'secondary'} className="capitalize">
                  {selected.status.replace(/_/g, ' ')}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <FiCalendar className="h-4 w-4" />
                  {new Date(selected.scheduledAt).toLocaleString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FiMapPin className="h-4 w-4" />
                  {selected.line1}
                  {selected.pincode ? ` · ${selected.pincode}` : ''}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {selected.chiefComplaint && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chief complaint</p>
                  <p className="mt-1 text-sm">{selected.chiefComplaint}</p>
                </div>
              )}
              {selected.symptoms && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Symptoms</p>
                  <p className="mt-1 text-sm">{selected.symptoms}</p>
                </div>
              )}
              {selected.patientNotes && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
                  <p className="mt-1 text-sm">{selected.patientNotes}</p>
                </div>
              )}

              {selected.sampleCollection && (
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sample collection</p>
                  <p className="mt-1 font-mono text-sm">{selected.sampleCollection.sampleCode}</p>
                  <Badge variant="outline" className="mt-2 capitalize">
                    {selected.sampleCollection.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              )}

              {(selected.canCancel || selected.canReschedule || showTracking) && (
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  {showTracking && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/appointments/${selected.id}/tracking`)}
                    >
                      Track technician
                    </Button>
                  )}
                  {showTeleJoin && (
                    <Button variant="outline" size="sm" onClick={() => navigate(`/appointments/${selected.id}/tele`)}>
                      Join teleconsultation
                    </Button>
                  )}
                  {selected.canReschedule && (
                    <Button variant="outline" size="sm" onClick={() => setRescheduleOpen(true)}>
                      Reschedule
                    </Button>
                  )}
                  {selected.canCancel && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setCancelOpen(true)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentStatusStepper steps={selected.progressSteps} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentTimeline
                events={selected.timeline}
                unifiedTimeline={selected.unifiedTimeline}
              />
            </CardContent>
          </Card>

          <AppointmentPrescriptionCard appointmentId={selected.id} showSection={Boolean(showPrescription)} />
        </>
      )}

      {selected && (
        <>
          <CancelAppointmentDialog
            open={cancelOpen}
            appointmentId={selected.id}
            onClose={() => setCancelOpen(false)}
            onDone={() => navigate('/appointments')}
          />
          <RescheduleAppointmentDialog
            open={rescheduleOpen}
            appointment={selected}
            onClose={() => setRescheduleOpen(false)}
            onDone={() => void loadDetail(selected.id)}
          />
        </>
      )}
    </div>
  );
}
