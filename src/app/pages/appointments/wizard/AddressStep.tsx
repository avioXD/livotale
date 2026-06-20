import { useEffect, useMemo } from 'react';
import { FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useServiceZonesStore } from '@/store';
import { evaluatePincode } from '@/types/serviceZone';
import type { PatientAddress } from '@/types';

interface AddressStepProps {
  addresses: PatientAddress[];
  addressId: string;
  onAddressChange: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function AddressStep({ addresses, addressId, onAddressChange, onBack, onNext }: Readonly<AddressStepProps>) {
  const zones = useServiceZonesStore((s) => s.zones);
  const fetchZones = useServiceZonesStore((s) => s.fetchZones);

  useEffect(() => {
    void fetchZones();
  }, [fetchZones]);

  const selectedAddress = addresses.find((a) => a.id === addressId) ?? null;

  const serviceability = useMemo(() => {
    if (!selectedAddress?.pincode) return null;
    return evaluatePincode(zones, selectedAddress.pincode);
  }, [zones, selectedAddress]);

  const pincodeBlocked = serviceability != null && !serviceability.serviceable;
  const valid = Boolean(addressId || addresses.length === 0) && !pincodeBlocked;

  const serviceabilityMessage = () => {
    if (!serviceability || !selectedAddress?.pincode) return null;
    if (serviceability.serviceable) {
      return (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          <FiCheckCircle className="h-4 w-4 shrink-0" />
          Serviceable in {serviceability.zone?.city} ({selectedAddress.pincode}).
        </div>
      );
    }
    const reason =
      serviceability.reason === 'city_inactive'
        ? `Home visits are temporarily paused in ${serviceability.zone?.city}.`
        : `Pincode ${selectedAddress.pincode} is outside our current service zones.`;
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <FiAlertTriangle className="h-4 w-4 shrink-0" />
        {reason}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Home visit address</CardTitle>
        <CardDescription>Select where the technician should visit.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {addresses.length === 0 ? (
          <p className="text-sm text-destructive">
            No saved address found. Add an address in your profile or patient journey first.
          </p>
        ) : (
          <div className="space-y-2">
            <Label>Address</Label>
            <Select value={addressId} onValueChange={onAddressChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select address" />
              </SelectTrigger>
              <SelectContent>
                {addresses.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.line1}{a.pincode ? ` · ${a.pincode}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {serviceabilityMessage()}

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
