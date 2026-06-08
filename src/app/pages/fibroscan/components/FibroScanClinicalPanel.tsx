import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { technicianAppointmentsService } from '@/services';
import type { TechnicianScheduleItem } from '@/types';

interface LiverFibrosisScanClinicalPanelProps {
  appointmentId: string;
  summary: TechnicianScheduleItem;
  onUpdated?: () => void;
}

export function LiverFibrosisScanClinicalPanel({ appointmentId, summary, onUpdated }: LiverFibrosisScanClinicalPanelProps) {
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
  const fibroResults = (visit?.liverFibrosisScanResults as Array<Record<string, unknown>>) ?? [];
  const latestFibro = fibroResults[0];
  const vitalsRecord = visit?.vitals as Record<string, unknown> | null | undefined;

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setDetail(await technicianAppointmentsService.getById(appointmentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clinical detail');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [appointmentId]);

  const run = async (action: () => Promise<unknown>) => {
    setIsSaving(true);
    setError(null);
    try {
      await action();
      await load();
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsSaving(false);
    }
  };

  const address = [summary.line1, summary.line2, summary.cityName, summary.pincode].filter(Boolean).join(', ');

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading clinical workflow…</p>;
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Patient</p>
          <p className="font-medium">{summary.patientName}</p>
          <p className="text-sm text-muted-foreground">{summary.patientCode ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Visit</p>
          <p className="text-sm">{summary.typeName}</p>
          <Badge className="mt-1 capitalize">{String(summary.status).replace(/_/g, ' ')}</Badge>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">Address</p>
          <p className="text-sm">{address || '—'}</p>
        </div>
        {summary.chiefComplaint && (
          <div className="sm:col-span-2 lg:col-span-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Chief complaint</p>
            <p className="text-sm text-muted-foreground">{summary.chiefComplaint}</p>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Clinical checklist</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {checklist.length === 0 ? (
            <p className="text-sm text-muted-foreground">No checklist items yet.</p>
          ) : (
            checklist.map((item) => (
              <Badge key={item.code} variant={item.status === 'done' ? 'default' : 'outline'}>
                {item.title}: {item.status}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      {latestFibro && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Latest Liver Fibrosis Scan reading</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-4">
            <div>
              <span className="text-muted-foreground">Stiffness</span>
              <p className="font-medium">{String(latestFibro.liver_stiffness_kpa ?? '—')} kPa</p>
            </div>
            <div>
              <span className="text-muted-foreground">CAP</span>
              <p className="font-medium">{String(latestFibro.cap_dbm ?? '—')} dB/m</p>
            </div>
            <div>
              <span className="text-muted-foreground">Fibrosis</span>
              <p className="font-medium">{String(latestFibro.fibrosis_stage ?? '—')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Steatosis</span>
              <p className="font-medium">{String(latestFibro.steatosis_grade ?? '—')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {vitalsRecord && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recorded vitals</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-5">
            <div>Weight: {String(vitalsRecord.weight_kg ?? '—')} kg</div>
            <div>Height: {String(vitalsRecord.height_cm ?? '—')} cm</div>
            <div>BMI: {String(vitalsRecord.bmi ?? '—')}</div>
            <div>BP: {String(vitalsRecord.bp_systolic ?? '—')}/{String(vitalsRecord.bp_diastolic ?? '—')}</div>
            <div>Waist: {String(vitalsRecord.waist_cm ?? '—')} cm</div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Digital consent</CardTitle></CardHeader>
          <CardContent>
            <Button size="sm" disabled={isSaving} onClick={() => void run(() => technicianAppointmentsService.captureConsent(appointmentId))}>
              Capture consent
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Vitals & BMI</CardTitle></CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const weight = Number(vitals.weightKg);
                const height = Number(vitals.heightCm);
                const bmi = height && weight ? Number((weight / ((height / 100) ** 2)).toFixed(1)) : undefined;
                void run(() =>
                  technicianAppointmentsService.captureVitals(appointmentId, {
                    weightKg: weight,
                    heightCm: height,
                    bmi,
                    bpSystolic: Number(vitals.bpSystolic),
                    bpDiastolic: Number(vitals.bpDiastolic),
                    waistCm: Number(vitals.waistCm),
                  }),
                );
              }}
              className="grid grid-cols-2 gap-2"
            >
              <Input placeholder="Weight (kg)" value={vitals.weightKg} onChange={(e) => setVitals({ ...vitals, weightKg: e.target.value })} />
              <Input placeholder="Height (cm)" value={vitals.heightCm} onChange={(e) => setVitals({ ...vitals, heightCm: e.target.value })} />
              <Input placeholder="BP systolic" value={vitals.bpSystolic} onChange={(e) => setVitals({ ...vitals, bpSystolic: e.target.value })} />
              <Input placeholder="BP diastolic" value={vitals.bpDiastolic} onChange={(e) => setVitals({ ...vitals, bpDiastolic: e.target.value })} />
              <Input placeholder="Waist (cm)" value={vitals.waistCm} onChange={(e) => setVitals({ ...vitals, waistCm: e.target.value })} />
              <Button type="submit" size="sm" className="col-span-2" disabled={isSaving}>Save vitals</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Liver Fibrosis Scan capture</CardTitle></CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(() =>
                  technicianAppointmentsService.captureLiverFibrosisScan(appointmentId, {
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
              <Input placeholder="Fibrosis stage" value={fibro.fibrosisStage} onChange={(e) => setFibro({ ...fibro, fibrosisStage: e.target.value })} />
              <Input placeholder="Steatosis grade" value={fibro.steatosisGrade} onChange={(e) => setFibro({ ...fibro, steatosisGrade: e.target.value })} />
              <Button type="submit" size="sm" className="col-span-2" disabled={isSaving}>Save Liver Fibrosis Scan</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Blood sample</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Input placeholder="Sample barcode" value={sampleCode} onChange={(e) => setSampleCode(e.target.value)} />
            <Button
              size="sm"
              disabled={isSaving || !sampleCode}
              onClick={() =>
                void run(() =>
                  technicianAppointmentsService.collectSample(appointmentId, {
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
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Escalation</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            placeholder="Clinical issue or visit blocker"
            value={issueNote}
            onChange={(e) => setIssueNote(e.target.value)}
            rows={2}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={isSaving || issueNote.trim().length < 3}
            onClick={() =>
              void run(() =>
                technicianAppointmentsService.reportIssue(appointmentId, { note: issueNote.trim(), escalate: true }),
              )
            }
          >
            Escalate to ops
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
