import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface DetailsStepProps {
  chiefComplaint: string;
  symptoms: string;
  notes: string;
  onChiefComplaintChange: (value: string) => void;
  onSymptomsChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function DetailsStep({
  chiefComplaint,
  symptoms,
  notes,
  onChiefComplaintChange,
  onSymptomsChange,
  onNotesChange,
  onBack,
  onNext,
}: DetailsStepProps) {
  const valid = chiefComplaint.trim().length >= 3;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visit details</CardTitle>
        <CardDescription>Help us prepare for your appointment. Chief complaint is required.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="chief-complaint">Chief complaint *</Label>
          <Textarea
            id="chief-complaint"
            placeholder="e.g. Fatigue, abdominal discomfort, follow-up FibroScan"
            value={chiefComplaint}
            onChange={(e) => onChiefComplaintChange(e.target.value)}
            rows={2}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="symptoms">Symptoms (optional)</Label>
          <Textarea
            id="symptoms"
            placeholder="Any symptoms you want the team to know about"
            value={symptoms}
            onChange={(e) => onSymptomsChange(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="visit-notes">Notes (optional)</Label>
          <Textarea
            id="visit-notes"
            placeholder="Gate code, parking, accessibility needs…"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={2}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
            Back
          </Button>
          <Button className="flex-1" disabled={!valid} onClick={onNext}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
