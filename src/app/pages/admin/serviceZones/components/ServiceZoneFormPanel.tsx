import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { parsePincodeList, type CreateServiceZoneInput, type ServiceZone } from '@/types/serviceZone';

interface ServiceZoneFormPanelProps {
  zone?: ServiceZone | null;
  saving?: boolean;
  onSubmit: (input: CreateServiceZoneInput) => void;
  onCancel: () => void;
}

export function ServiceZoneFormPanel({ zone, saving = false, onSubmit, onCancel }: Readonly<ServiceZoneFormPanelProps>) {
  const [city, setCity] = useState(zone?.city ?? '');
  const [state, setState] = useState(zone?.state ?? '');
  const [pincodesInput, setPincodesInput] = useState((zone?.pincodes ?? []).join(', '));
  const [active, setActive] = useState(zone?.active ?? true);
  const [notes, setNotes] = useState(zone?.notes ?? '');
  const [touched, setTouched] = useState(false);

  const pincodes = parsePincodeList(pincodesInput);
  let submitLabel: string;
  if (saving) submitLabel = 'Saving…';
  else submitLabel = zone ? 'Save changes' : 'Create zone';
  const cityValid = city.trim().length > 0;
  const stateValid = state.trim().length > 0;
  const pincodesValid = pincodes.length > 0;
  const isValid = cityValid && stateValid && pincodesValid;

  const handleSubmit = () => {
    setTouched(true);
    if (!isValid) return;
    onSubmit({
      city: city.trim(),
      state: state.trim(),
      pincodes,
      active,
      notes: notes.trim() ? notes.trim() : null,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{zone ? `Edit ${zone.city}` : 'Add service zone'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="zone-city">City</Label>
            <Input
              id="zone-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Mumbai"
            />
            {touched && !cityValid && <p className="text-xs text-destructive">City is required.</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zone-state">State</Label>
            <Input
              id="zone-state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Maharashtra"
            />
            {touched && !stateValid && <p className="text-xs text-destructive">State is required.</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="zone-pincodes">Serviced pincodes</Label>
          <Textarea
            id="zone-pincodes"
            value={pincodesInput}
            onChange={(e) => setPincodesInput(e.target.value)}
            placeholder="Comma or space separated, e.g. 400001, 400013, 400028"
            rows={3}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{pincodes.length} pincode(s):</span>
            {pincodes.slice(0, 12).map((p) => (
              <Badge key={p} variant="outline" className="font-mono text-xs">{p}</Badge>
            ))}
            {pincodes.length > 12 && (
              <span className="text-xs text-muted-foreground">+{pincodes.length - 12} more</span>
            )}
          </div>
          {touched && !pincodesValid && (
            <p className="text-xs text-destructive">Add at least one pincode for this city.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="zone-notes">Notes (optional)</Label>
          <Textarea
            id="zone-notes"
            value={notes ?? ''}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Coverage notes, rollout status, etc."
            rows={2}
          />
        </div>

        <label className="flex items-center gap-2 text-sm" htmlFor="zone-active">
          <input
            id="zone-active"
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span>Active — bookings and assignments allowed in this city</span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !isValid}>
            {submitLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
