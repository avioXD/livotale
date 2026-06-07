import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PatientAppointmentRecord } from '@/types/patientProfile';

interface PatientAppointmentsPanelProps {
  appointments: PatientAppointmentRecord[];
  detailLinkPrefix?: string;
}

export function PatientAppointmentsPanel({
  appointments,
  detailLinkPrefix = '/appointments',
}: PatientAppointmentsPanelProps) {
  if (appointments.length === 0) {
    return <p className="text-sm text-muted-foreground">No appointments recorded for this patient.</p>;
  }

  return (
    <div className="space-y-3">
      {appointments.map((row) => (
        <Card key={row.id}>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-base">{row.typeName}</CardTitle>
              <p className="font-mono text-xs text-muted-foreground">{row.appointmentCode}</p>
            </div>
            <Badge variant="outline" className="capitalize">
              {row.status.replace(/_/g, ' ')}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">When: </span>
              {new Date(row.scheduledStart).toLocaleString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
              {' · '}
              <span className="capitalize">{row.visitMode}</span>
            </p>
            {row.doctorName && (
              <p>
                <span className="text-muted-foreground">Doctor: </span>
                {row.doctorName}
              </p>
            )}
            {row.technicianName && (
              <p>
                <span className="text-muted-foreground">Technician: </span>
                {row.technicianName}
              </p>
            )}
            {row.chiefComplaint && (
              <p>
                <span className="text-muted-foreground">Complaint: </span>
                {row.chiefComplaint}
              </p>
            )}
            <Button variant="link" className="h-auto p-0" asChild>
              <Link to={`${detailLinkPrefix}/${row.id}`}>View appointment</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
