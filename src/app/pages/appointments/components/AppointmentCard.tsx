import { useState } from 'react';
import { FiCalendar, FiMapPin, FiUser } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppointmentStatusStepper } from '@/app/pages/appointments/components/AppointmentStatusStepper';
import type { AppointmentSummary } from '@/types';

interface AppointmentCardProps {
  appointment: AppointmentSummary;
  showPatient?: boolean;
  onOpen?: () => void;
  onReschedule?: (id: string) => void;
  onCancel?: (id: string) => void;
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  booked: 'secondary',
  assigned: 'default',
  in_progress: 'default',
  completed: 'outline',
  cancelled: 'destructive',
  rescheduled: 'secondary',
  no_show: 'destructive',
};

function formatVisitType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function appointmentTitle(appointment: AppointmentSummary) {
  const name = appointment.typeName ?? formatVisitType(appointment.visitType);
  const mode = appointment.visitMode ?? appointment.unified?.visitMode;
  if (mode === 'home') return `${name} · Home`;
  if (mode === 'clinic') return `${name} · Clinic`;
  if (mode === 'tele') return `${name} · Online`;
  return name;
}

export function AppointmentCard({
  appointment,
  showPatient,
  onOpen,
  onReschedule,
  onCancel,
}: AppointmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const canModify =
    appointment.canCancel !== undefined || appointment.canReschedule !== undefined
      ? Boolean(appointment.canReschedule || appointment.canCancel)
      : ['booked', 'assigned'].includes(appointment.status);

  return (
    <Card
      className={`overflow-hidden shadow-sm ${onOpen ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}`}
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
    >
      <CardHeader className="space-y-3 px-5 pb-3 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">{appointmentTitle(appointment)}</CardTitle>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <FiCalendar className="h-3.5 w-3.5" />
                {new Date(appointment.scheduledAt).toLocaleString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </CardDescription>
          </div>
          <Badge variant={statusVariant[appointment.status] ?? 'secondary'} className="capitalize">
            {appointment.status.replace(/_/g, ' ')}
          </Badge>
        </div>

        {showPatient && appointment.patientName && (
          <p className="text-sm text-muted-foreground">
            <FiUser className="mr-1 inline h-3.5 w-3.5" />
            {appointment.patientName}
            {appointment.patientCode ? ` · ${appointment.patientCode}` : ''}
          </p>
        )}

        <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
          <p className="font-medium text-livotel-pink">{appointment.currentStepLabel}</p>
          <p className="text-xs text-muted-foreground">Current booking status</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-5 pb-5 pt-0">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <FiMapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {appointment.line1}
            {appointment.line2 ? `, ${appointment.line2}` : ''}
            {appointment.pincode ? ` · ${appointment.pincode}` : ''}
          </span>
        </div>

        {appointment.technicianName && (
          <p className="text-sm">
            <span className="text-muted-foreground">Technician: </span>
            <span className="font-medium">{appointment.technicianName}</span>
          </p>
        )}

        {appointment.patientNotes && (
          <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
            {appointment.patientNotes}
          </p>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-0 text-livotel-pink hover:bg-transparent hover:text-livotel-pink/80"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? 'Hide progress' : 'View step-by-step progress'}
        </Button>

        {expanded && (
          <div className="rounded-lg border bg-card p-4">
            <AppointmentStatusStepper steps={appointment.progressSteps} />
          </div>
        )}

        {canModify && onReschedule && onCancel && (
          <div
            className="flex flex-wrap gap-2 border-t pt-4"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {appointment.canReschedule !== false && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onReschedule(appointment.id)}
              >
                Reschedule
              </Button>
            )}
            {appointment.canCancel !== false && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onCancel(appointment.id)}
              >
                Cancel
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
