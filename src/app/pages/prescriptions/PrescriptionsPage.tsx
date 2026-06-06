import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { journeyService } from '@/services';

interface PrescriptionListItem {
  prescription_id: string;
  patient_name: string;
  patient_code: string;
  diagnosis: string | null;
  status: string;
  created_at: string;
}

interface PrescriptionDetail extends PrescriptionListItem {
  diet_plan: string | null;
  exercise_plan: string | null;
  monitoring_plan: string | null;
  prescription_type: string;
}

export function PrescriptionsPage() {
  const [pending, setPending] = useState<PrescriptionListItem[]>([]);
  const [selected, setSelected] = useState<PrescriptionDetail | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await journeyService.getPendingPrescriptions();
      setPending(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prescriptions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleApprove = async () => {
    if (!selected) return;
    try {
      await journeyService.approvePrescription(selected.prescription_id, notes || 'Approved after review');
      setSelected(null);
      setNotes('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prescription Review"
        description="Review AI-generated draft prescriptions. Patients only see approved, digitally signed prescriptions."
      />
      {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-medium">Pending Review ({pending.length})</h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : pending.length === 0 ? (
            <Card><CardContent className="py-6 text-sm text-muted-foreground">No draft prescriptions awaiting review.</CardContent></Card>
          ) : (
            pending.map((rx) => (
              <Card key={rx.prescription_id} className={selected?.prescription_id === rx.prescription_id ? 'ring-2 ring-primary' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{rx.patient_name}</CardTitle>
                    <Badge>{rx.status}</Badge>
                  </div>
                  <CardDescription>{rx.patient_code} · {new Date(rx.created_at).toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-2 text-sm line-clamp-2">{rx.diagnosis}</p>
                  <Button size="sm" onClick={() => void (async () => {
                    const detail = await journeyService.getPrescription(rx.prescription_id);
                    setSelected(detail as PrescriptionDetail);
                  })()}>Review</Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle>Draft Prescription Review</CardTitle>
              <CardDescription>{selected.patient_name} · AI draft — edit before approval</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div><Label>Diagnosis</Label><p className="mt-1">{selected.diagnosis}</p></div>
              <div><Label>Diet Protocol</Label><p className="mt-1">{selected.diet_plan}</p></div>
              <div><Label>Exercise Plan</Label><p className="mt-1">{selected.exercise_plan}</p></div>
              <div><Label>Monitoring</Label><p className="mt-1">{selected.monitoring_plan}</p></div>
              <div className="space-y-2">
                <Label htmlFor="notes">Doctor Notes</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Review notes and signature confirmation" />
              </div>
              <Button className="w-full" onClick={() => void handleApprove()}>Approve & Sign Prescription</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
