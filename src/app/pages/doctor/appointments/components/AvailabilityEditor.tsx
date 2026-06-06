import { useEffect, useState } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DoctorAvailabilityRule } from '@/types';

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_RULE: DoctorAvailabilityRule = {
  dayOfWeek: 1,
  startTime: '10:00',
  endTime: '14:00',
  slotDurationMinutes: 30,
  bufferMinutes: 0,
  visitModes: ['clinic', 'tele'],
};

interface AvailabilityEditorProps {
  rules: Array<Record<string, unknown>>;
  isSaving: boolean;
  onSave: (rules: DoctorAvailabilityRule[]) => Promise<void>;
}

function mapRule(row: Record<string, unknown>): DoctorAvailabilityRule {
  return {
    id: row.id as string | undefined,
    dayOfWeek: Number(row.day_of_week),
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    slotDurationMinutes: Number(row.slot_duration_minutes ?? 30),
    bufferMinutes: Number(row.buffer_minutes ?? 0),
    maxAppointmentsPerDay: row.max_appointments_per_day != null ? Number(row.max_appointments_per_day) : null,
    visitModes: (row.visit_modes as DoctorAvailabilityRule['visitModes']) ?? ['clinic', 'tele'],
  };
}

export function AvailabilityEditor({ rules, isSaving, onSave }: AvailabilityEditorProps) {
  const [draft, setDraft] = useState<DoctorAvailabilityRule[]>([DEFAULT_RULE]);

  useEffect(() => {
    if (rules.length) setDraft(rules.map(mapRule));
  }, [rules]);

  const updateRule = (index: number, patch: Partial<DoctorAvailabilityRule>) => {
    setDraft((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly availability</CardTitle>
        <CardDescription>
          Set your clinic and teleconsultation hours. Slots are generated for the next 30 days without double-booking.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {draft.map((rule, index) => (
          <div key={`${rule.dayOfWeek}-${index}`} className="grid gap-3 rounded-lg border p-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Day</Label>
              <Select
                value={String(rule.dayOfWeek)}
                onValueChange={(v) => updateRule(index, { dayOfWeek: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_LABELS.map((label, day) => (
                    <SelectItem key={label} value={String(day)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start</Label>
              <Input type="time" value={rule.startTime} onChange={(e) => updateRule(index, { startTime: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Input type="time" value={rule.endTime} onChange={(e) => updateRule(index, { endTime: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Slot (min)</Label>
              <Input
                type="number"
                min={15}
                step={5}
                value={rule.slotDurationMinutes ?? 30}
                onChange={(e) => updateRule(index, { slotDurationMinutes: Number(e.target.value) })}
              />
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setDraft((rows) => [...rows, { ...DEFAULT_RULE }])}>
            Add day
          </Button>
          <Button type="button" disabled={isSaving} onClick={() => void onSave(draft)}>
            {isSaving ? 'Saving…' : 'Save availability'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
