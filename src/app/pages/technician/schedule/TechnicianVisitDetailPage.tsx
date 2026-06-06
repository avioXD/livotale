import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { technicianAppointmentsService } from '@/services';

export function TechnicianVisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [vitals, setVitals] = useState({ weightKg: '', heightCm: '', bpSystolic: '', bpDiastolic: '', waistCm: '' });
  const [fibro, setFibro] = useState({ liverStiffnessKpa: '', capDbm: '', fibrosisStage: 'F2', steatosisGrade: 'S2' });
  const [sampleCode, setSampleCode] = useState('');
  const [issueNote, setIssueNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visit = detail?.visit as Record<string, unknown> | undefined;
  const checklist = (visit?.checklist as Array<{ code: string; title: string; status: string }>) ?? [];

  const load = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await technicianAppointmentsService.getById(id);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load visit');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const runAction = async (action: () => Promise<unknown>) => {
    setIsSaving(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsSaving(false);
    }
  };

  const pingGeo = () => {
    if (!id || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      void runAction(() =>
        technicianAppointmentsService.recordGeo({
          appointmentId: id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
        }),
      );
    });
  };

  const handleVitals = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const weight = Number(vitals.weightKg);
    const height = Number(vitals.heightCm);
    const bmi = height && weight ? Number((weight / ((height / 100) ** 2)).toFixed(1)) : undefined;
    await runAction(() =>
      technicianAppointmentsService.captureVitals(id, {
        weightKg: weight,
        heightCm: height,
        bmi,
        bpSystolic: Number(vitals.bpSystolic),
        bpDiastolic: Number(vitals.bpDiastolic),
        waistCm: Number(vitals.waistCm),
      }),
    );
  };

  if (!id) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={String(detail?.patientName ?? 'Field visit')}
        description={String(detail?.appointmentCode ?? '')}
        actions={
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/technician/schedule')}>
            <FiArrowLeft className="h-4 w-4" />
            Schedule
          </Button>
        }
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading visit…</p>
      ) : detail ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge className="capitalize">{String(detail.status).replace(/_/g, ' ')}</Badge>
            <Badge variant="outline">{String(detail.typeName)}</Badge>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Field actions</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button size="sm" disabled={isSaving} onClick={() => void runAction(() => technicianAppointmentsService.accept(id))}>
                Accept
              </Button>
              <Button size="sm" disabled={isSaving} onClick={() => void runAction(() => technicianAppointmentsService.startJourney(id))}>
                Start journey
              </Button>
              <Button size="sm" variant="outline" disabled={isSaving} onClick={pingGeo}>
                Ping location
              </Button>
              <Button size="sm" disabled={isSaving} onClick={() => void runAction(() => technicianAppointmentsService.markArrived(id))}>
                Mark arrived
              </Button>
              <Button size="sm" disabled={isSaving} onClick={() => void runAction(() => technicianAppointmentsService.complete(id))}>
                Complete visit
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Checklist</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {checklist.map((item) => (
                <Badge key={item.code} variant={item.status === 'done' ? 'default' : 'outline'}>
                  {item.title}: {item.status}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Digital consent</CardTitle></CardHeader>
            <CardContent>
              <Button disabled={isSaving} onClick={() => void runAction(() => technicianAppointmentsService.captureConsent(id))}>
                Capture consent
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Vitals (BMI auto-calculated)</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={(e) => void handleVitals(e)} className="grid grid-cols-2 gap-2">
                <Input placeholder="Weight (kg)" value={vitals.weightKg} onChange={(e) => setVitals({ ...vitals, weightKg: e.target.value })} />
                <Input placeholder="Height (cm)" value={vitals.heightCm} onChange={(e) => setVitals({ ...vitals, heightCm: e.target.value })} />
                <Input placeholder="BP systolic" value={vitals.bpSystolic} onChange={(e) => setVitals({ ...vitals, bpSystolic: e.target.value })} />
                <Input placeholder="BP diastolic" value={vitals.bpDiastolic} onChange={(e) => setVitals({ ...vitals, bpDiastolic: e.target.value })} />
                <Input placeholder="Waist (cm)" value={vitals.waistCm} onChange={(e) => setVitals({ ...vitals, waistCm: e.target.value })} />
                <Button type="submit" className="col-span-2" disabled={isSaving}>Save vitals</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">FibroScan</CardTitle></CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void runAction(() =>
                    technicianAppointmentsService.captureFibroscan(id, {
                      liverStiffnessKpa: Number(fibro.liverStiffnessKpa),
                      capDbm: Number(fibro.capDbm),
                      fibrosisStage: fibro.fibrosisStage,
                      steatosisGrade: fibro.steatosisGrade,
                    }),
                  );
                }}
                className="grid grid-cols-2 gap-2"
              >
                <Input placeholder="Liver stiffness (kPa)" value={fibro.liverStiffnessKpa} onChange={(e) => setFibro({ ...fibro, liverStiffnessKpa: e.target.value })} />
                <Input placeholder="CAP (dB/m)" value={fibro.capDbm} onChange={(e) => setFibro({ ...fibro, capDbm: e.target.value })} />
                <Button type="submit" className="col-span-2" disabled={isSaving}>Save FibroScan</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Blood sample</CardTitle></CardHeader>
            <CardContent className="flex gap-2">
              <Input placeholder="Sample barcode" value={sampleCode} onChange={(e) => setSampleCode(e.target.value)} />
              <Button
                disabled={isSaving || !sampleCode}
                onClick={() =>
                  void runAction(() =>
                    technicianAppointmentsService.collectSample(id, {
                      sampleCode,
                      sampleType: 'blood',
                      tubesCount: 3,
                    }),
                  )
                }
              >
                Record sample
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Report issue / escalation</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Describe the issue for operations team"
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={isSaving || issueNote.trim().length < 3}
                  onClick={() =>
                    void runAction(() =>
                      technicianAppointmentsService.reportIssue(id, { note: issueNote.trim(), escalate: true }),
                    )
                  }
                >
                  Escalate issue
                </Button>
                <Button
                  variant="destructive"
                  disabled={isSaving || issueNote.trim().length < 3}
                  onClick={() =>
                    void runAction(() =>
                      technicianAppointmentsService.markFailed(id, {
                        reasonCode: 'patient_not_at_home',
                        reasonText: issueNote.trim(),
                        note: issueNote.trim(),
                      }),
                    )
                  }
                >
                  Mark visit failed
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
