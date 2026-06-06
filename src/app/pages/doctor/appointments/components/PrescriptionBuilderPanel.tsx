import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AppointmentPrescriptionBundle, PrescriptionItemInput } from '@/types';

interface PrescriptionBuilderPanelProps {
  bundle: AppointmentPrescriptionBundle | null;
  isSaving: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  onApprove: (payload: { doctorNotes: string }) => Promise<void>;
}

export function PrescriptionBuilderPanel({
  bundle,
  isSaving,
  onSave,
  onApprove,
}: PrescriptionBuilderPanelProps) {
  const rx = bundle?.prescription;
  const [diagnosis, setDiagnosis] = useState(rx?.diagnosis ?? '');
  const [chiefComplaint, setChiefComplaint] = useState(rx?.chiefComplaint ?? '');
  const [dietPlan, setDietPlan] = useState(rx?.dietPlan ?? '');
  const [exercisePlan, setExercisePlan] = useState(rx?.exercisePlan ?? '');
  const [monitoringPlan, setMonitoringPlan] = useState(rx?.monitoringPlan ?? '');
  const [followUpDays, setFollowUpDays] = useState(String(rx?.followUpDays ?? 30));
  const [doctorNotes, setDoctorNotes] = useState(rx?.doctorNotes ?? '');
  const [medicineName, setMedicineName] = useState('');
  const [medicineDosage, setMedicineDosage] = useState('');
  const [medicineFrequency, setMedicineFrequency] = useState('');
  const [items, setItems] = useState<PrescriptionItemInput[]>(rx?.items ?? []);

  const addMedicine = () => {
    if (!medicineName.trim()) return;
    setItems((rows) => [
      ...rows,
      {
        itemType: 'medicine',
        name: medicineName.trim(),
        dosage: medicineDosage.trim() || undefined,
        frequency: medicineFrequency.trim() || undefined,
      },
    ]);
    setMedicineName('');
    setMedicineDosage('');
    setMedicineFrequency('');
  };

  const buildPayload = () => ({
    chiefComplaint: chiefComplaint.trim() || undefined,
    diagnosis: diagnosis.trim() || undefined,
    dietPlan: dietPlan.trim() || undefined,
    exercisePlan: exercisePlan.trim() || undefined,
    monitoringPlan: monitoringPlan.trim() || undefined,
    followUpDays: followUpDays ? Number(followUpDays) : undefined,
    doctorNotes: doctorNotes.trim() || undefined,
    items,
    supplements: rx?.supplements ?? [],
    recommendedTests: rx?.recommendedTests ?? [],
    lifestyleAdvice: rx?.lifestyleAdvice ?? {},
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">Prescription builder</CardTitle>
          {bundle?.isAiDraft && <Badge variant="secondary">AI draft — review before approval</Badge>}
          {rx?.status === 'approved' && <Badge>Approved</Badge>}
        </div>
        <CardDescription>Medicines, lifestyle advice, follow-up, and tests linked to this appointment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {bundle?.versions?.length ? (
          <p className="text-xs text-muted-foreground">
            {bundle.versions.length} saved version{bundle.versions.length === 1 ? '' : 's'} on file
          </p>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rx-complaint">Chief complaint</Label>
            <Input id="rx-complaint" value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rx-diagnosis">Diagnosis</Label>
            <Input id="rx-diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rx-diet">Diet protocol</Label>
          <Textarea id="rx-diet" value={dietPlan} onChange={(e) => setDietPlan(e.target.value)} rows={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rx-exercise">Exercise plan</Label>
          <Textarea id="rx-exercise" value={exercisePlan} onChange={(e) => setExercisePlan(e.target.value)} rows={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rx-monitor">Monitoring plan</Label>
          <Textarea id="rx-monitor" value={monitoringPlan} onChange={(e) => setMonitoringPlan(e.target.value)} rows={2} />
        </div>

        <div className="space-y-2">
          <Label>Medicines</Label>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Name" value={medicineName} onChange={(e) => setMedicineName(e.target.value)} className="min-w-[140px] flex-1" />
            <Input placeholder="Dosage" value={medicineDosage} onChange={(e) => setMedicineDosage(e.target.value)} className="w-28" />
            <Input placeholder="Frequency" value={medicineFrequency} onChange={(e) => setMedicineFrequency(e.target.value)} className="w-28" />
            <Button type="button" variant="outline" size="sm" onClick={addMedicine}>Add</Button>
          </div>
          {items.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {items.map((item, index) => (
                <li key={`${item.name}-${index}`}>
                  {item.name} {item.dosage ? `· ${item.dosage}` : ''} {item.frequency ? `· ${item.frequency}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rx-followup">Follow-up (days)</Label>
            <Input id="rx-followup" type="number" min={1} value={followUpDays} onChange={(e) => setFollowUpDays(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rx-notes">Doctor notes</Label>
            <Textarea id="rx-notes" value={doctorNotes} onChange={(e) => setDoctorNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button disabled={isSaving || rx?.status === 'approved'} onClick={() => void onSave(buildPayload())}>
            {isSaving ? 'Saving…' : 'Save draft'}
          </Button>
          {rx?.status !== 'approved' && (
            <Button
              variant="default"
              disabled={isSaving || !diagnosis.trim()}
              onClick={() => void onApprove({ doctorNotes: doctorNotes.trim() || 'Approved after review' })}
            >
              Approve & generate PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
