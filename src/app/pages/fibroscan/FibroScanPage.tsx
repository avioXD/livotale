import { useEffect, useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { journeyService } from '@/services';
import type { TechnicianVisit, VisitDetail } from '@/types';

export function FibroScanPage() {
  const [visits, setVisits] = useState<TechnicianVisit[]>([]);
  const [selected, setSelected] = useState<VisitDetail | null>(null);
  const [vitals, setVitals] = useState({ weightKg: '', heightCm: '', bpSystolic: '', bpDiastolic: '', waistCm: '' });
  const [fibro, setFibro] = useState({ liverStiffnessKpa: '', capDbm: '', fibrosisStage: 'F2', steatosisGrade: 'S2' });
  const [sampleCode, setSampleCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedVisitId = selected
    ? String((selected as VisitDetail & { id?: string }).id ?? selected.visit_id)
    : '';

  const loadVisits = async () => {
    setIsLoading(true);
    try {
      const data = await journeyService.getTechnicianVisitsToday();
      setVisits(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load visits');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadVisits(); }, []);

  const openVisit = async (id: string) => {
    try {
      const detail = await journeyService.getTechnicianVisit(id);
      setSelected(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load visit');
    }
  };

  const handleConsent = async () => {
    if (!selectedVisitId) return;
    await journeyService.captureConsent(selectedVisitId);
    await openVisit(selectedVisitId);
  };

  const handleVitals = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedVisitId) return;
    const weight = Number(vitals.weightKg);
    const height = Number(vitals.heightCm);
    const bmi = height && weight ? Number((weight / ((height / 100) ** 2)).toFixed(1)) : undefined;
    await journeyService.captureVitals(selectedVisitId, {
      weightKg: weight, heightCm: height, bmi,
      bpSystolic: Number(vitals.bpSystolic), bpDiastolic: Number(vitals.bpDiastolic),
      waistCm: Number(vitals.waistCm),
    });
    await openVisit(selectedVisitId);
  };

  const handleFibroscan = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedVisitId) return;
    await journeyService.captureFibroscan(selectedVisitId, {
      liverStiffnessKpa: Number(fibro.liverStiffnessKpa),
      capDbm: Number(fibro.capDbm),
      fibrosisStage: fibro.fibrosisStage,
      steatosisGrade: fibro.steatosisGrade,
    });
    await openVisit(selectedVisitId);
  };

  const handleSample = async () => {
    if (!selectedVisitId || !sampleCode) return;
    await journeyService.collectSample(selectedVisitId, {
      sampleCode, sampleType: 'blood', tubesCount: 3,
    });
    await openVisit(selectedVisitId);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="FibroScan & Field Collection" description="Technician workflow: consent, vitals, FibroScan, and blood samples." />

      {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-medium">Today&apos;s Visits</h3>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : visits.map((v) => (
            <Card key={v.visit_id} className={selected?.visit_id === v.visit_id ? 'ring-2 ring-primary' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{v.patient_name}</CardTitle>
                <CardDescription>{v.patient_code} · {new Date(v.scheduled_at).toLocaleTimeString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-sm text-muted-foreground">{v.line1}</p>
                <Badge variant="secondary">{v.status}</Badge>
                <Button size="sm" className="ml-2" onClick={() => void openVisit(v.visit_id)}>Open</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {selected && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{selected.patient_name}</CardTitle>
                <CardDescription>Checklist progress</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {selected.checklist?.map((item) => (
                  <Badge key={item.code} variant={item.status === 'done' ? 'default' : 'outline'}>{item.title}: {item.status}</Badge>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Digital Consent</CardTitle></CardHeader>
              <CardContent><Button onClick={() => void handleConsent()}>Capture Consent</Button></CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Vitals</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={(e) => void handleVitals(e)} className="grid grid-cols-2 gap-2">
                  <Input placeholder="Weight (kg)" value={vitals.weightKg} onChange={(e) => setVitals({ ...vitals, weightKg: e.target.value })} />
                  <Input placeholder="Height (cm)" value={vitals.heightCm} onChange={(e) => setVitals({ ...vitals, heightCm: e.target.value })} />
                  <Input placeholder="BP Systolic" value={vitals.bpSystolic} onChange={(e) => setVitals({ ...vitals, bpSystolic: e.target.value })} />
                  <Input placeholder="BP Diastolic" value={vitals.bpDiastolic} onChange={(e) => setVitals({ ...vitals, bpDiastolic: e.target.value })} />
                  <Input placeholder="Waist (cm)" value={vitals.waistCm} onChange={(e) => setVitals({ ...vitals, waistCm: e.target.value })} />
                  <Button type="submit" className="col-span-2">Save Vitals</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">FibroScan</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={(e) => void handleFibroscan(e)} className="grid grid-cols-2 gap-2">
                  <Input placeholder="Liver stiffness (kPa)" value={fibro.liverStiffnessKpa} onChange={(e) => setFibro({ ...fibro, liverStiffnessKpa: e.target.value })} />
                  <Input placeholder="CAP (dB/m)" value={fibro.capDbm} onChange={(e) => setFibro({ ...fibro, capDbm: e.target.value })} />
                  <Input placeholder="Fibrosis stage" value={fibro.fibrosisStage} onChange={(e) => setFibro({ ...fibro, fibrosisStage: e.target.value })} />
                  <Input placeholder="Steatosis grade" value={fibro.steatosisGrade} onChange={(e) => setFibro({ ...fibro, steatosisGrade: e.target.value })} />
                  <Button type="submit" className="col-span-2">Save FibroScan</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Blood Sample</CardTitle></CardHeader>
              <CardContent className="flex gap-2">
                <Input placeholder="Sample code" value={sampleCode} onChange={(e) => setSampleCode(e.target.value)} />
                <Button onClick={() => void handleSample()}>Record Sample</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
