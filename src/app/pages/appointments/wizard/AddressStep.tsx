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
import type { PatientAddress } from '@/types';

interface AddressStepProps {
  addresses: PatientAddress[];
  addressId: string;
  onAddressChange: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function AddressStep({ addresses, addressId, onAddressChange, onBack, onNext }: AddressStepProps) {
  const valid = Boolean(addressId || addresses.length === 0);

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
