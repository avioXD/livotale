import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogTextarea } from '@/components/forms/LogTextarea';
import { Textarea } from '@/components/ui/textarea';
import { prescriptionOrderService } from '@/services/liverCare';
import type { ConsultationVisitLog, LiverCarePrescription, PrescriptionMedicine } from '@/types/consultation';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { LiverCarePrescriptionPreview } from './LiverCarePrescriptionPreview';

const ADVICE_TEMPLATES = {
  diet: 'Low-fat, high-fibre diet. Avoid alcohol and fried foods. Small frequent meals.',
  lifestyle: '30 min brisk walk daily. Maintain healthy BMI. Adequate sleep (7–8 hrs).',
  followUp: 'Repeat LFT in 6 weeks. Follow up if jaundice, abdominal pain, or swelling.',
  warnings: 'Seek emergency care for vomiting blood, severe abdominal pain, or confusion.',
};

interface LiverCarePrescriptionEditorProps {
  order: LiverCareOrder;
  visitLog: ConsultationVisitLog;
  onPublished?: () => void;
}

function toDateTimeLocal(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

function newMedicineId() {
  return `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function LiverCarePrescriptionEditor({ order, visitLog, onPublished }: LiverCarePrescriptionEditorProps) {
  const [rx, setRx] = useState<LiverCarePrescription | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [dietAdvice, setDietAdvice] = useState('');
  const [lifestyleAdvice, setLifestyleAdvice] = useState('');
  const [followUpAdvice, setFollowUpAdvice] = useState('');
  const [warningSigns, setWarningSigns] = useState('');
  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>([]);
  const [medName, setMedName] = useState('');
  const [medStrength, setMedStrength] = useState('');
  const [medDosage, setMedDosage] = useState('1');
  const [medFrequency, setMedFrequency] = useState('OD');
  const [medDuration, setMedDuration] = useState('30 days');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const load = async () => {
    const existing = await prescriptionOrderService.getForVisit(order.id, visitLog.id);
    setRx(existing);
    if (existing) {
      setDiagnosis(existing.diagnosis ?? '');
      setClinicalNotes(existing.clinicalNotes ?? '');
      setSymptoms(existing.symptoms ?? visitLog.symptoms ?? '');
      setVisitDate(toDateTimeLocal(existing.visitDate ?? visitLog.visitCompletedAt));
      setFollowUpDate(toDateTimeLocal(existing.followUpDate ?? visitLog.followUpAt));
      setDietAdvice(existing.dietAdvice ?? '');
      setLifestyleAdvice(existing.lifestyleAdvice ?? '');
      setFollowUpAdvice(existing.followUpAdvice ?? '');
      setWarningSigns(existing.warningSigns ?? '');
      setMedicines(existing.medicines);
    } else {
      setClinicalNotes(visitLog.doctorNotes ?? '');
      setSymptoms(visitLog.symptoms ?? '');
      setVisitDate(toDateTimeLocal(visitLog.visitCompletedAt ?? new Date().toISOString()));
      setFollowUpDate(toDateTimeLocal(visitLog.followUpAt));
      setMedicines([]);
    }
  };

  useEffect(() => {
    void load();
  }, [order.id, visitLog.id, visitLog.updatedAt]);

  const isPublished = rx?.status === 'published';

  const addMedicine = () => {
    if (!medName.trim()) return;
    setMedicines((rows) => [
      ...rows,
      {
        id: newMedicineId(),
        name: medName.trim(),
        strength: medStrength.trim() || null,
        form: 'tablet',
        dosage: medDosage.trim() || '1',
        frequency: medFrequency.trim() || 'OD',
        timing: 'after_food',
        duration: medDuration.trim() || '30 days',
      },
    ]);
    setMedName('');
    setMedStrength('');
  };

  const buildInput = () => ({
    diagnosis: diagnosis.trim() || null,
    clinicalNotes: clinicalNotes.trim() || null,
    symptoms: symptoms.trim() || null,
    visitDate: visitDate ? new Date(visitDate).toISOString() : null,
    followUpDate: followUpDate ? new Date(followUpDate).toISOString() : null,
    medicines,
    dietAdvice: dietAdvice.trim() || null,
    lifestyleAdvice: lifestyleAdvice.trim() || null,
    followUpAdvice: followUpAdvice.trim() || null,
    warningSigns: warningSigns.trim() || null,
  });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await prescriptionOrderService.saveDraft(order.id, visitLog.id, buildInput());
      setRx(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    setError(null);
    try {
      await prescriptionOrderService.saveDraft(order.id, visitLog.id, buildInput());
      const published = await prescriptionOrderService.publish(order.id, visitLog.id);
      setRx(published);
      onPublished?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRevise = async () => {
    setSaving(true);
    try {
      const revised = await prescriptionOrderService.createRevision(order.id, visitLog.id);
      setRx(revised);
    } finally {
      setSaving(false);
    }
  };

  const draftPreview: LiverCarePrescription | null = rx ?? (diagnosis || medicines.length ? {
    id: `rx-draft-${visitLog.id}`,
    orderId: order.id,
    visitLogId: visitLog.id,
    patientId: order.patientId,
    consultationId: `con-${order.id}`,
    doctorId: 'doc-1',
    doctorName: 'Dr. Meera Iyer',
    doctorDegree: 'MD, DM (Hepatology)',
    doctorRegistration: 'MMC-45821',
    status: 'draft',
    diagnosis,
    clinicalNotes,
    symptoms,
    visitDate: visitDate ? new Date(visitDate).toISOString() : null,
    followUpDate: followUpDate ? new Date(followUpDate).toISOString() : null,
    medicines,
    dietAdvice,
    lifestyleAdvice,
    followUpAdvice,
    warningSigns,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } : null);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">Prescription</CardTitle>
          {rx?.status && <Badge className="capitalize">{rx.status}</Badge>}
          {rx?.revisionOf && <Badge variant="secondary">Revision of {rx.revisionOf}</Badge>}
          {rx?.version && rx.version > 1 && <Badge variant="outline">v{rx.version}</Badge>}
        </div>
        <CardDescription>Structured medicines, advice, and publish to patient portal.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rx-diagnosis">Diagnosis</Label>
            <Input id="rx-diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} disabled={isPublished} />
          </div>
          <LogTextarea
            id="rx-notes"
            label="Clinical notes"
            value={clinicalNotes}
            onChange={setClinicalNotes}
            limit="LOG_LONG"
            disabled={isPublished}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rx-symptoms">Symptoms</Label>
            <Textarea id="rx-symptoms" rows={2} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} disabled={isPublished} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rx-visit">Visit date</Label>
            <Input id="rx-visit" type="datetime-local" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} disabled={isPublished} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="rx-followup-date">Follow-up date</Label>
            <Input id="rx-followup-date" type="datetime-local" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} disabled={isPublished} />
          </div>
        </div>

        {!isPublished && (
          <div className="rounded-md border p-3 space-y-3">
            <p className="text-sm font-medium">Add medicine</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input placeholder="Name" value={medName} onChange={(e) => setMedName(e.target.value)} />
              <Input placeholder="Strength (e.g. 500mg)" value={medStrength} onChange={(e) => setMedStrength(e.target.value)} />
              <Input placeholder="Dosage" value={medDosage} onChange={(e) => setMedDosage(e.target.value)} />
              <Input placeholder="Frequency" value={medFrequency} onChange={(e) => setMedFrequency(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Input className="max-w-xs" placeholder="Duration" value={medDuration} onChange={(e) => setMedDuration(e.target.value)} />
              <Button type="button" size="sm" variant="secondary" onClick={addMedicine}>Add</Button>
            </div>
          </div>
        )}

        {medicines.length > 0 && (
          <ul className="space-y-2 text-sm">
            {medicines.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded border px-3 py-2">
                <span>
                  {m.name} {m.strength ? `(${m.strength})` : ''} — {m.dosage} {m.frequency} × {m.duration}
                </span>
                {!isPublished && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setMedicines((rows) => rows.filter((r) => r.id !== m.id))}>
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Diet advice</Label>
              {!isPublished && (
                <Button type="button" size="sm" variant="ghost" className="h-auto p-0 text-xs" onClick={() => setDietAdvice(ADVICE_TEMPLATES.diet)}>
                  Use template
                </Button>
              )}
            </div>
            <Textarea value={dietAdvice} onChange={(e) => setDietAdvice(e.target.value)} rows={2} disabled={isPublished} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Lifestyle</Label>
              {!isPublished && (
                <Button type="button" size="sm" variant="ghost" className="h-auto p-0 text-xs" onClick={() => setLifestyleAdvice(ADVICE_TEMPLATES.lifestyle)}>
                  Use template
                </Button>
              )}
            </div>
            <Textarea value={lifestyleAdvice} onChange={(e) => setLifestyleAdvice(e.target.value)} rows={2} disabled={isPublished} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Follow-up</Label>
              {!isPublished && (
                <Button type="button" size="sm" variant="ghost" className="h-auto p-0 text-xs" onClick={() => setFollowUpAdvice(ADVICE_TEMPLATES.followUp)}>
                  Use template
                </Button>
              )}
            </div>
            <Textarea value={followUpAdvice} onChange={(e) => setFollowUpAdvice(e.target.value)} rows={2} disabled={isPublished} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Warning signs</Label>
              {!isPublished && (
                <Button type="button" size="sm" variant="ghost" className="h-auto p-0 text-xs" onClick={() => setWarningSigns(ADVICE_TEMPLATES.warnings)}>
                  Use template
                </Button>
              )}
            </div>
            <Textarea value={warningSigns} onChange={(e) => setWarningSigns(e.target.value)} rows={2} disabled={isPublished} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isPublished && (
            <>
              <Button type="button" onClick={() => void handleSave()} disabled={saving}>Save draft</Button>
              <Button type="button" variant="default" onClick={() => void handlePublish()} disabled={saving || medicines.length === 0}>
                Publish to patient
              </Button>
            </>
          )}
          {isPublished && (
            <>
              {rx?.pdfUrl && (
                <Button asChild variant="outline">
                  <a href={rx.pdfUrl} target="_blank" rel="noreferrer">Download PDF</a>
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={() => void handleRevise()} disabled={saving}>
                Create revision
              </Button>
            </>
          )}
          <Button type="button" variant="outline" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? 'Hide preview' : 'Preview'}
          </Button>
        </div>

        {showPreview && draftPreview && (
          <LiverCarePrescriptionPreview order={order} prescription={draftPreview} />
        )}
      </CardContent>
    </Card>
  );
}
