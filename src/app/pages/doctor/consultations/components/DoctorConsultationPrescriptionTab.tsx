import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConsultationVisitLogTimeline } from '@/app/pages/doctor/consultations/components/ConsultationVisitLogTimeline';
import { LiverCarePrescriptionEditor } from '@/app/pages/doctor/consultations/components/LiverCarePrescriptionEditor';
import { doctorConsultationService } from '@/services/liverCare';
import type { ConsultationVisitLog } from '@/types/consultation';
import type { LiverCareOrder } from '@/types/serviceOrder';

function toDateTimeLocal(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

interface DoctorConsultationPrescriptionTabProps {
  order: LiverCareOrder;
  visitLogs: ConsultationVisitLog[];
  selectedVisitId: string;
  onSelectVisit: (visitId: string) => void;
  onRefresh: () => Promise<void>;
}

export function DoctorConsultationPrescriptionTab({
  order,
  visitLogs,
  selectedVisitId,
  onSelectVisit,
  onRefresh,
}: DoctorConsultationPrescriptionTabProps) {
  const selectedVisit = visitLogs.find((v) => v.id === selectedVisitId) ?? visitLogs[visitLogs.length - 1];
  const [symptoms, setSymptoms] = useState(selectedVisit?.symptoms ?? '');
  const [notes, setNotes] = useState(selectedVisit?.doctorNotes ?? '');
  const [visitAt, setVisitAt] = useState(toDateTimeLocal(selectedVisit?.visitCompletedAt ?? new Date().toISOString()));
  const [followUpAt, setFollowUpAt] = useState(toDateTimeLocal(selectedVisit?.followUpAt));
  const [followUpScheduleAt, setFollowUpScheduleAt] = useState('');
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSymptoms(selectedVisit?.symptoms ?? '');
    setNotes(selectedVisit?.doctorNotes ?? '');
    setVisitAt(toDateTimeLocal(selectedVisit?.visitCompletedAt ?? new Date().toISOString()));
    setFollowUpAt(toDateTimeLocal(selectedVisit?.followUpAt));
  }, [selectedVisit?.id, selectedVisit?.updatedAt]);

  if (!selectedVisit) {
    return <p className="text-muted-foreground">No visit selected.</p>;
  }

  const visitLocked = ['completed', 'prescription_draft', 'prescription_published'].includes(selectedVisit.status);
  const latestPublished = [...visitLogs].reverse().find((v) => v.status === 'prescription_published');
  const canScheduleFollowUp = latestPublished && selectedVisit.status === 'prescription_published';

  const run = async (fn: () => Promise<void>) => {
    setActing(true);
    setError(null);
    try {
      await fn();
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Visit log</h2>
        <ConsultationVisitLogTimeline
          visits={visitLogs}
          selectedVisitId={selectedVisit.id}
          onSelect={onSelectVisit}
        />
      </div>

      <div className="space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="font-medium">
            Visit #{selectedVisit.visitNumber} — {selectedVisit.visitType === 'follow_up' ? 'Follow-up' : 'Initial'}
          </h3>

          <div className="space-y-2">
            <Label htmlFor="visit-symptoms">Symptoms</Label>
            <Textarea
              id="visit-symptoms"
              rows={2}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              disabled={visitLocked}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit-notes">Consultation notes</Label>
            <Textarea
              id="visit-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={visitLocked}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="visit-at">Visit date</Label>
              <Input
                id="visit-at"
                type="datetime-local"
                value={visitAt}
                onChange={(e) => setVisitAt(e.target.value)}
                disabled={visitLocked}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visit-follow-up">Follow-up date</Label>
              <Input
                id="visit-follow-up"
                type="datetime-local"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
                disabled={visitLocked}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!visitLocked && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={acting}
                  onClick={() => void run(async () => {
                    await doctorConsultationService.updateVisitLog(order.id, selectedVisit.id, {
                      symptoms,
                      doctorNotes: notes,
                      followUpAt: followUpAt ? new Date(followUpAt).toISOString() : undefined,
                    });
                  })}
                >
                  Save visit draft
                </Button>
                <Button
                  type="button"
                  disabled={acting}
                  onClick={() => void run(async () => {
                    await doctorConsultationService.completeVisitLog(order.id, selectedVisit.id, {
                      symptoms,
                      doctorNotes: notes,
                      visitCompletedAt: visitAt ? new Date(visitAt).toISOString() : new Date().toISOString(),
                      followUpAt: followUpAt ? new Date(followUpAt).toISOString() : undefined,
                    });
                  })}
                >
                  Complete visit → write prescription
                </Button>
              </>
            )}
          </div>
        </div>

        {(visitLocked || selectedVisit.status === 'prescription_draft') && (
          <LiverCarePrescriptionEditor
            order={order}
            visitLog={selectedVisit}
            onPublished={() => void onRefresh()}
          />
        )}

        {canScheduleFollowUp && (
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <h3 className="font-medium">Schedule follow-up visit</h3>
            <p className="text-sm text-muted-foreground">
              After publishing a prescription, schedule the next follow-up. A new visit log will be created. You can write a prescription after completing the visit.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fu-schedule">Follow-up appointment</Label>
                <Input
                  id="fu-schedule"
                  type="datetime-local"
                  value={followUpScheduleAt}
                  onChange={(e) => setFollowUpScheduleAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fu-next">Next review date</Label>
                <Input
                  id="fu-next"
                  type="datetime-local"
                  value={followUpAt}
                  onChange={(e) => setFollowUpAt(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              disabled={acting || !followUpScheduleAt}
              onClick={() => void run(async () => {
                const visit = await doctorConsultationService.createFollowUpVisit(order.id, {
                  scheduledAt: new Date(followUpScheduleAt).toISOString(),
                  followUpAt: followUpAt ? new Date(followUpAt).toISOString() : undefined,
                });
                onSelectVisit(visit.id);
              })}
            >
              Add follow-up visit
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
