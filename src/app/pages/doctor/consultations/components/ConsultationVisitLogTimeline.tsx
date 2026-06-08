import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ConsultationVisitLog } from '@/types/consultation';

const VISIT_STATUS_LABELS: Record<ConsultationVisitLog['status'], string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Visit completed',
  prescription_draft: 'Rx draft',
  prescription_published: 'Rx published',
};

interface ConsultationVisitLogTimelineProps {
  visits: ConsultationVisitLog[];
  selectedVisitId?: string | null;
  onSelect?: (visitId: string) => void;
}

export function ConsultationVisitLogTimeline({
  visits,
  selectedVisitId,
  onSelect,
}: ConsultationVisitLogTimelineProps) {
  if (!visits.length) {
    return <p className="text-sm text-muted-foreground">No visit logs yet.</p>;
  }

  return (
    <div className="space-y-3">
      {visits.map((visit) => {
        const selected = visit.id === selectedVisitId;
        return (
          <Card
            key={visit.id}
            className={selected ? 'border-livotale-pink ring-1 ring-livotale-pink/30' : undefined}
          >
            <CardHeader className="cursor-pointer pb-2" onClick={() => onSelect?.(visit.id)}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium">
                  Visit #{visit.visitNumber}
                  {' · '}
                  {visit.visitType === 'follow_up' ? 'Follow-up' : 'Initial'}
                </CardTitle>
                <Badge variant="outline">{VISIT_STATUS_LABELS[visit.status]}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              {visit.scheduledAt && (
                <p>Scheduled: {new Date(visit.scheduledAt).toLocaleString()}</p>
              )}
              {visit.visitCompletedAt && (
                <p>Completed: {new Date(visit.visitCompletedAt).toLocaleString()}</p>
              )}
              {visit.followUpAt && (
                <p>Next follow-up: {new Date(visit.followUpAt).toLocaleString()}</p>
              )}
              {visit.symptoms && <p className="text-foreground">Symptoms: {visit.symptoms}</p>}
              {visit.doctorNotes && <p className="text-foreground">Notes: {visit.doctorNotes}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
