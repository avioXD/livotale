import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PatientVisitRecord } from '@/types/patientProfile';

interface PatientVisitsPanelProps {
  visits: PatientVisitRecord[];
}

export function PatientVisitsPanel({ visits }: PatientVisitsPanelProps) {
  if (visits.length === 0) {
    return <p className="text-sm text-muted-foreground">No home visits recorded for this patient.</p>;
  }

  return (
    <div className="space-y-3">
      {visits.map((row) => (
        <Card key={row.id}>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-base capitalize">{row.visitType.replace(/_/g, ' ')}</CardTitle>
              <p className="text-xs text-muted-foreground">{row.addressSummary ?? 'Address on file'}</p>
            </div>
            <Badge variant="outline" className="capitalize">
              {row.status}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Scheduled: </span>
              {new Date(row.scheduledAt).toLocaleString()}
            </p>
            {row.completedAt && (
              <p>
                <span className="text-muted-foreground">Completed: </span>
                {new Date(row.completedAt).toLocaleString()}
              </p>
            )}
            {row.technicianName && (
              <p>
                <span className="text-muted-foreground">Technician: </span>
                {row.technicianName}
              </p>
            )}
            {row.preferredTimeSlot && (
              <p>
                <span className="text-muted-foreground">Slot: </span>
                <span className="capitalize">{row.preferredTimeSlot}</span>
              </p>
            )}
            {row.checklistTotal != null && (
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">Checklist: </span>
                {row.checklistCompleted ?? 0} / {row.checklistTotal} completed
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
