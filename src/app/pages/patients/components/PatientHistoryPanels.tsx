import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { PatientHistory } from '@/types';

interface PanelProps {
  patientId: string;
  history: PatientHistory;
  isSaving: boolean;
  readOnly?: boolean;
  onSave: (section: string, payload: Record<string, unknown>) => Promise<void>;
}

type JsonSection = Record<string, unknown>;

function readSection(history: PatientHistory | null, key: string): JsonSection {
  const liver = history?.liverHistory as Record<string, JsonSection> | null;
  return (liver?.[key] as JsonSection) ?? {};
}

export function MedicalHistoryPanel({ history, isSaving, readOnly, onSave }: PanelProps) {
  const [items, setItems] = useState(history.conditions);

  useEffect(() => {
    setItems(history.conditions);
  }, [history.conditions]);

  const toggle = (code: string, present: boolean) => {
    setItems((prev) =>
      prev.map((c) =>
        String(c.condition_code) === code ? { ...c, is_present: present } : c,
      ),
    );
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    await onSave('conditions', {
      items: items.map((c) => ({
        conditionCode: c.condition_code,
        isPresent: c.is_present,
        yearDiagnosed: c.year_diagnosed,
        controlStatus: c.control_status,
      })),
    });
  };

  return (
    <form onSubmit={(e) => void handleSave(e)} className="space-y-3">
      {items.map((c) => (
        <div key={String(c.condition_code)} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
          <span className="min-w-[160px] flex-1 text-sm font-medium">{String(c.condition_name)}</span>
          <Select
            value={c.is_present ? 'yes' : 'no'}
            onValueChange={(v) => toggle(String(c.condition_code), v === 'yes')}
            disabled={readOnly}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">Absent</SelectItem>
              <SelectItem value="yes">Present</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ))}
      {!readOnly && (
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save medical history'}
        </Button>
      )}
    </form>
  );
}

export function LiverHistoryPanel({ history, isSaving, readOnly, onSave }: PanelProps) {
  const [fattyLiver, setFattyLiver] = useState(() => readSection(history, 'fatty_liver'));
  const [fibrosis, setFibrosis] = useState(() => readSection(history, 'fibrosis'));
  const [alcohol, setAlcohol] = useState(() => readSection(history, 'alcohol_history'));

  useEffect(() => {
    setFattyLiver(readSection(history, 'fatty_liver'));
    setFibrosis(readSection(history, 'fibrosis'));
    setAlcohol(readSection(history, 'alcohol_history'));
  }, [history.liverHistory]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    await onSave('liver', { fattyLiver, fibrosis, alcoholHistory: alcohol });
  };

  return (
    <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
      <section className="space-y-3 rounded-lg border p-4">
        <h4 className="font-medium">Fatty Liver</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Diagnosed</Label>
            <Select
              value={String(fattyLiver.diagnosed ?? 'unknown')}
              onValueChange={(v) => setFattyLiver({ ...fattyLiver, diagnosed: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unknown">Unknown</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Grade</Label>
            <Select
              value={String(fattyLiver.grade ?? '')}
              onValueChange={(v) => setFattyLiver({ ...fattyLiver, grade: v })}
            >
              <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="grade_1">Grade 1</SelectItem>
                <SelectItem value="grade_2">Grade 2</SelectItem>
                <SelectItem value="grade_3">Grade 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h4 className="font-medium">Fibrosis</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Stage</Label>
            <Select
              value={String(fibrosis.stage ?? '')}
              onValueChange={(v) => setFibrosis({ ...fibrosis, stage: v })}
            >
              <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent>
                {['F0', 'F1', 'F2', 'F3', 'F4'].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Liver Fibrosis Scan kPa</Label>
            <Input
              type="number"
              step="0.1"
              value={String(fibrosis.kpa ?? '')}
              onChange={(e) => setFibrosis({ ...fibrosis, kpa: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h4 className="font-medium">Alcohol History</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Consumption</Label>
            <Select
              value={String(alcohol.consumption ?? 'unknown')}
              onValueChange={(v) => setAlcohol({ ...alcohol, consumption: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unknown">Unknown</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Duration (years)</Label>
            <Input
              type="number"
              value={String(alcohol.durationYears ?? '')}
              onChange={(e) => setAlcohol({ ...alcohol, durationYears: e.target.value })}
            />
          </div>
        </div>
      </section>

      {!readOnly && (
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save liver history'}
        </Button>
      )}
    </form>
  );
}

export function AllergyPanel({ isSaving, onSave }: PanelProps) {
  const [allergen, setAllergen] = useState('');
  const [type, setType] = useState('drug');
  const [severity, setSeverity] = useState('moderate');

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!allergen.trim()) return;
    await onSave('allergies', {
      items: [{ allergenName: allergen.trim(), allergyType: type, severity, alertFlag: true }],
    });
    setAllergen('');
  };

  return (
    <form onSubmit={(e) => void handleAdd(e)} className="space-y-4 rounded-lg border p-4">
      <h4 className="font-medium">Add allergy</h4>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1 sm:col-span-2">
          <Label>Allergen</Label>
          <Input value={allergen} onChange={(e) => setAllergen(e.target.value)} placeholder="e.g. Penicillin" />
        </div>
        <div className="space-y-1">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="drug">Drug</SelectItem>
              <SelectItem value="food">Food</SelectItem>
              <SelectItem value="environmental">Environmental</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Severity</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mild">Mild</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="severe">Severe</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" disabled={isSaving || !allergen.trim()}>
        Add allergy alert
      </Button>
    </form>
  );
}

export function MedicationsPanel({ history, isSaving, readOnly, onSave }: PanelProps) {
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState('');

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSave('medications', {
      items: [{ medicineName: name.trim(), dose, frequency, isCurrent: true }],
    });
    setName('');
    setDose('');
    setFrequency('');
  };

  return (
    <div className="space-y-4">
      {(history.medications ?? []).map((m) => (
        <div key={String(m.id)} className="rounded-lg border p-3 text-sm">
          <p className="font-medium">{String(m.medicine_name)}</p>
          <p className="text-muted-foreground">
            {String(m.dose ?? '—')} · {String(m.frequency ?? '—')}
            {m.is_current ? ' · Current' : ''}
          </p>
        </div>
      ))}
      {!readOnly && (
        <form onSubmit={(e) => void handleAdd(e)} className="space-y-3 rounded-lg border p-4">
          <h4 className="font-medium">Add medication</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input placeholder="Medicine name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Dose" value={dose} onChange={(e) => setDose(e.target.value)} />
            <Input placeholder="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} />
          </div>
          <Button type="submit" disabled={isSaving || !name.trim()}>Add medication</Button>
        </form>
      )}
    </div>
  );
}

export function FamilyPanel({ history, isSaving, readOnly, onSave }: PanelProps) {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('father');
  const [notes, setNotes] = useState('');

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSave('family', {
      items: [{ fullName: name.trim(), relationship, notes: notes || null }],
    });
    setName('');
    setNotes('');
  };

  return (
    <div className="space-y-4">
      {(history.familyMembers ?? []).map((f) => (
        <div key={String(f.id)} className="rounded-lg border p-3 text-sm">
          <p className="font-medium">{String(f.full_name)}</p>
          <p className="text-muted-foreground capitalize">{String(f.relationship)}</p>
        </div>
      ))}
      {!readOnly && (
        <form onSubmit={(e) => void handleAdd(e)} className="space-y-3 rounded-lg border p-4">
          <h4 className="font-medium">Add family member</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['father', 'mother', 'sibling', 'child', 'other'].map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea placeholder="Notes (conditions, liver disease in family…)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button type="submit" disabled={isSaving || !name.trim()}>Add family member</Button>
        </form>
      )}
    </div>
  );
}

export function DemographicsPanel({ detail, isSaving, readOnly, onSave }: {
  detail: Record<string, unknown>;
  isSaving: boolean;
  readOnly?: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const p = detail.patient as Record<string, unknown>;
  const [occupation, setOccupation] = useState(String(p.occupation ?? ''));
  const [lifestyle, setLifestyle] = useState(String(p.lifestyle_type ?? ''));
  const [foodPref, setFoodPref] = useState(String(p.food_preference ?? ''));
  const [waist, setWaist] = useState(String(p.waist_cm ?? ''));

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    await onSave({
      occupation: occupation || null,
      lifestyleType: lifestyle || null,
      foodPreference: foodPref || null,
      waistCm: waist ? Number(waist) : null,
    });
  };

  return (
    <form onSubmit={(e) => void handleSave(e)} className="grid max-w-lg gap-4 rounded-lg border p-4 sm:grid-cols-2">
      <div className="space-y-1">
        <Label>Occupation</Label>
        <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} disabled={readOnly} />
      </div>
      <div className="space-y-1">
        <Label>Waist (cm)</Label>
        <Input type="number" value={waist} onChange={(e) => setWaist(e.target.value)} disabled={readOnly} />
      </div>
      <div className="space-y-1">
        <Label>Lifestyle</Label>
        <Select value={lifestyle || 'sedentary'} onValueChange={setLifestyle} disabled={readOnly}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sedentary">Sedentary</SelectItem>
            <SelectItem value="moderate">Moderately Active</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="highly_active">Highly Active</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Food preference</Label>
        <Select value={foodPref || 'mixed'} onValueChange={setFoodPref} disabled={readOnly}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="vegetarian">Vegetarian</SelectItem>
            <SelectItem value="non_vegetarian">Non-Vegetarian</SelectItem>
            <SelectItem value="vegan">Vegan</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!readOnly && (
        <div className="sm:col-span-2">
          <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save demographics'}</Button>
        </div>
      )}
    </form>
  );
}
