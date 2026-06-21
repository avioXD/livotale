import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { patientsService } from '@/services';
import { useAuthStore, useServiceZonesStore, useUserRole } from '@/store';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { canEditPatientProfile } from '@/types/patientProfile';
import { evaluatePincode } from '@/types/serviceZone';
import { isPaymentReadyForScan } from '@/services/liverCare/scanSchedule';

interface OrderVisitAddressSectionProps {
  order: LiverCareOrder;
  onUpdated: () => void;
}

function sourceLabel(source: LiverCareOrder['visitLocation']): string {
  if (!source) return 'Not on file';
  if (source.source === 'patient_address') return 'On file';
  if (source.source === 'enquiry') return 'From enquiry (incomplete)';
  return 'Not on file';
}

export function OrderVisitAddressSection({ order, onUpdated }: OrderVisitAddressSectionProps) {
  const userRole = useUserRole();
  const userRoles = useAuthStore((s) => s.user?.roles ?? []);
  const canEdit = canEditPatientProfile(userRole, userRoles);
  const zones = useServiceZonesStore((s) => s.zones);
  const fetchZones = useServiceZonesStore((s) => s.fetchZones);

  const visitLocation = order.visitLocation;
  const isComplete = visitLocation?.isComplete === true;

  const [line1, setLine1] = useState(visitLocation?.address ?? '');
  const [line2, setLine2] = useState('');
  const [pincode, setPincode] = useState(visitLocation?.pincode ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(!isComplete && canEdit);

  useEffect(() => {
    void fetchZones();
  }, [fetchZones]);

  useEffect(() => {
    setLine1(visitLocation?.address ?? '');
    setPincode(visitLocation?.pincode ?? '');
    setEditing(!isComplete && canEdit);
  }, [order.id, visitLocation?.address, visitLocation?.pincode, visitLocation?.isComplete, isComplete, canEdit]);

  const serviceability = useMemo(() => {
    const pc = visitLocation?.pincode ?? pincode;
    if (!pc) return null;
    return evaluatePincode(zones, pc);
  }, [zones, visitLocation?.pincode, pincode]);

  if (!isPaymentReadyForScan(order)) {
    return null;
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!order.patientId) return;
    setSaving(true);
    setError(null);
    try {
      await patientsService.updateDemographics(order.patientId, {
        addressLine1: line1.trim(),
        addressLine2: line2.trim() || null,
        pincode: pincode.trim(),
      });
      setEditing(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save address');
    } finally {
      setSaving(false);
    }
  };

  const pincodeWarning = () => {
    const pc = isComplete ? visitLocation?.pincode : pincode;
    if (!pc) return null;
    const result = evaluatePincode(zones, pc);
    if (!result || result.serviceable) {
      if (result?.serviceable) {
        return (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            <FiCheckCircle className="h-4 w-4 shrink-0" />
            Serviceable in {result.zone?.city} ({pc}).
          </div>
        );
      }
      return null;
    }
    const reason =
      result.reason === 'city_inactive'
        ? `Home visits are temporarily paused in ${result.zone?.city}.`
        : `Pincode ${pc} is outside our current service zones.`;
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <FiAlertTriangle className="h-4 w-4 shrink-0" />
        {reason} You can still confirm the schedule.
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">Home visit address</CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {sourceLabel(visitLocation)}
          </Badge>
        </div>
        <CardDescription>
          Technician will visit this address for the FibroScan home visit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {isComplete && !editing ? (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/20 px-3 py-3 text-sm">
              <p className="font-medium">{visitLocation?.address}</p>
              {(visitLocation?.city || visitLocation?.pincode) && (
                <p className="mt-1 text-muted-foreground">
                  {[visitLocation?.city, visitLocation?.pincode].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            {pincodeWarning()}
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit address
              </Button>
            )}
          </div>
        ) : editing && canEdit ? (
          <form className="space-y-3" onSubmit={(e) => void handleSave(e)}>
            <div className="space-y-1">
              <Label htmlFor="visit-address-line1">Address line 1</Label>
              <Input
                id="visit-address-line1"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                placeholder="House / flat, street"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="visit-address-line2">Address line 2 (optional)</Label>
              <Input
                id="visit-address-line2"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                placeholder="Landmark, area"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="visit-address-pincode">Pincode</Label>
              <Input
                id="visit-address-pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="e.g. 700001"
                required
                maxLength={12}
              />
            </div>
            {pincodeWarning()}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={saving || !line1.trim() || !pincode.trim()}>
                {saving ? 'Saving…' : 'Save address'}
              </Button>
              {isComplete && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        ) : (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>No complete home address on file for this patient.</p>
            {visitLocation?.address && (
              <p className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-amber-900">
                Enquiry address: {visitLocation.address}
                {visitLocation.city ? `, ${visitLocation.city}` : ''} — pincode required before scheduling.
              </p>
            )}
            {!canEdit && <p>Contact operations to add the patient&apos;s home address.</p>}
          </div>
        )}

        {!isComplete && serviceability && !serviceability.serviceable && !editing && (
          <p className="text-xs text-amber-700">Pincode is required to confirm the home visit schedule.</p>
        )}
      </CardContent>
    </Card>
  );
}
