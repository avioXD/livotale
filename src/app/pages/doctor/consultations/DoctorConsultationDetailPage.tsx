import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { doctorConsultationService, liverCareOrderService } from '@/services/liverCare';
import type { Consultation } from '@/types/consultation';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import { DoctorMedicalSummaryPanel } from './components/DoctorMedicalSummaryPanel';
import { LiverCarePrescriptionEditor } from './components/LiverCarePrescriptionEditor';

export function DoctorConsultationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<LiverCareOrder | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [notes, setNotes] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const o = await liverCareOrderService.getById(id);
    setOrder(o);
    const c = (await doctorConsultationService.getConsultation(id)) ?? (o ? await doctorConsultationService.ensureConsultation(id) : null);
    setConsultation(c);
    if (c?.doctorNotes) setNotes(c.doctorNotes);
    if (c?.scheduledAt) setScheduleAt(c.scheduledAt.slice(0, 16));
  };

  useEffect(() => {
    void load();
  }, [id]);

  const run = async (fn: () => Promise<void>) => {
    setActing(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(false);
    }
  };

  if (!order) {
    return <p className="text-muted-foreground">Order not found.</p>;
  }

  const showRx = consultation && ['prescription_pending', 'prescription_published'].includes(consultation.status)
    || ['prescription_pending', 'prescription_generated', 'completed'].includes(order.orderStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title={order.patientName}
          description={`${order.orderNumber} · ${ORDER_STATUS_LABELS[order.orderStatus]}`}
        />
        <Button variant="outline" asChild>
          <Link to="/doctor/consultations">Back to list</Link>
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Consultation</CardTitle>
            {consultation && <Badge className="capitalize">{consultation.status.replaceAll('_', ' ')}</Badge>}
            {consultation?.consultationType && (
              <Badge variant="outline" className="capitalize">{consultation.consultationType}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {consultation?.meetingLink && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
              <p className="font-medium text-blue-900">Video meeting (dummy)</p>
              <a href={consultation.meetingLink} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                {consultation.meetingLink}
              </a>
              {consultation.scheduledAt && (
                <p className="mt-1 text-blue-800">Scheduled {new Date(consultation.scheduledAt).toLocaleString()}</p>
              )}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sched-at">Reschedule</Label>
              <Input
                id="sched-at"
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={acting || !scheduleAt}
                onClick={() => void run(async () => {
                  const c = await doctorConsultationService.schedule(id!, new Date(scheduleAt).toISOString());
                  setConsultation(c);
                })}
              >
                Save schedule
              </Button>
              {consultation?.status === 'consultation_scheduled' && (
                <Button type="button" disabled={acting} onClick={() => void run(async () => {
                  setConsultation(await doctorConsultationService.start(id!));
                })}>
                  Start consultation
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-notes">Consultation notes</Label>
            <Textarea id="doc-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={acting}
              onClick={() => void run(async () => {
                setConsultation(await doctorConsultationService.updateNotes(id!, notes));
              })}
            >
              Save notes
            </Button>
            {consultation && !['prescription_pending', 'prescription_published', 'cancelled'].includes(consultation.status) && (
              <Button
                type="button"
                disabled={acting}
                onClick={() => void run(async () => {
                  setConsultation(await doctorConsultationService.complete(id!));
                })}
              >
                Complete consultation → Rx
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Clinical summary</h2>
        <DoctorMedicalSummaryPanel orderId={order.id} />
      </div>

      {showRx && (
        <LiverCarePrescriptionEditor order={order} onPublished={() => void load()} />
      )}
    </div>
  );
}
