import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PatientDetail } from '@/types';

interface PatientContactPanelProps {
  detail: PatientDetail;
  editable?: boolean;
  isSaving?: boolean;
  onSave?: (payload: Record<string, unknown>) => Promise<void>;
}

export function PatientContactPanel({
  detail,
  editable = false,
  isSaving = false,
  onSave,
}: PatientContactPanelProps) {
  const p = detail.patient as Record<string, unknown>;
  const address = detail.addresses?.[0] as Record<string, unknown> | undefined;

  const [fullName, setFullName] = useState(String(p.full_name ?? ''));
  const [mobile, setMobile] = useState(String(p.mobile ?? ''));
  const [email, setEmail] = useState(String(p.email ?? ''));
  const [dob, setDob] = useState(p.dob ? String(p.dob).slice(0, 10) : '');
  const [gender, setGender] = useState(String(p.gender ?? 'undisclosed'));
  const [heightCm, setHeightCm] = useState(String(p.height_cm ?? ''));
  const [weightKg, setWeightKg] = useState(String(p.current_weight_kg ?? ''));
  const [line1, setLine1] = useState(String(address?.line1 ?? ''));
  const [line2, setLine2] = useState(String(address?.line2 ?? ''));
  const [pincode, setPincode] = useState(String(address?.pincode ?? ''));
  const [emergencyName, setEmergencyName] = useState(String(p.emergency_contact_name ?? ''));
  const [emergencyMobile, setEmergencyMobile] = useState(String(p.emergency_contact_mobile ?? ''));
  const [occupation, setOccupation] = useState(String(p.occupation ?? ''));

  useEffect(() => {
    setFullName(String(p.full_name ?? ''));
    setMobile(String(p.mobile ?? ''));
    setEmail(String(p.email ?? ''));
    setDob(p.dob ? String(p.dob).slice(0, 10) : '');
    setGender(String(p.gender ?? 'undisclosed'));
    setHeightCm(String(p.height_cm ?? ''));
    setWeightKg(String(p.current_weight_kg ?? ''));
    setLine1(String(address?.line1 ?? ''));
    setLine2(String(address?.line2 ?? ''));
    setPincode(String(address?.pincode ?? ''));
    setEmergencyName(String(p.emergency_contact_name ?? ''));
    setEmergencyMobile(String(p.emergency_contact_mobile ?? ''));
    setOccupation(String(p.occupation ?? ''));
  }, [detail]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!onSave) return;
    await onSave({
      fullName: fullName.trim(),
      mobile: mobile.trim() || null,
      email: email.trim() || null,
      dob: dob || null,
      gender,
      heightCm: heightCm ? Number(heightCm) : null,
      weightKg: weightKg ? Number(weightKg) : null,
      occupation: occupation.trim() || null,
      emergencyContactName: emergencyName.trim() || null,
      emergencyContactMobile: emergencyMobile.trim() || null,
      addressLine1: line1.trim() || null,
      addressLine2: line2.trim() || null,
      pincode: pincode.trim() || null,
    });
  };

  if (!editable) {
    const rows = [
      { label: 'Mobile', value: String(p.mobile ?? '—') },
      { label: 'Email', value: String(p.email ?? '—') },
      { label: 'Date of birth', value: p.dob ? new Date(String(p.dob)).toLocaleDateString() : '—' },
      { label: 'Gender', value: String(p.gender ?? '—') },
      {
        label: 'Height / Weight',
        value: p.height_cm && p.current_weight_kg ? `${p.height_cm} cm · ${p.current_weight_kg} kg` : '—',
      },
      {
        label: 'Address',
        value: address
          ? [address.line1, address.line2, address.pincode, address.city_name].filter(Boolean).join(', ')
          : '—',
      },
      {
        label: 'Emergency contact',
        value: p.emergency_contact_name
          ? `${p.emergency_contact_name}${p.emergency_contact_mobile ? ` · ${p.emergency_contact_mobile}` : ''}`
          : '—',
      },
      { label: 'Occupation', value: String(p.occupation ?? '—') },
    ];

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Contact & demographics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          {rows.map((row) => (
            <div key={row.label}>
              <p className="text-muted-foreground">{row.label}</p>
              <p className="font-medium">{row.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Edit profile details</CardTitle>
        <CardDescription>Update patient contact, address, and basic demographics.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSave(e)} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="profile-full-name">Full name</Label>
            <Input id="profile-full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="profile-mobile">Mobile</Label>
            <Input id="profile-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="profile-dob">Date of birth</Label>
            <Input id="profile-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="undisclosed">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="profile-height">Height (cm)</Label>
            <Input id="profile-height" type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="profile-weight">Weight (kg)</Label>
            <Input id="profile-weight" type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="profile-address">Address line 1</Label>
            <Input id="profile-address" value={line1} onChange={(e) => setLine1(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="profile-address2">Address line 2</Label>
            <Input id="profile-address2" value={line2} onChange={(e) => setLine2(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="profile-pincode">Pincode</Label>
            <Input id="profile-pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="profile-occupation">Occupation</Label>
            <Input id="profile-occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="profile-emergency-name">Emergency contact name</Label>
            <Input id="profile-emergency-name" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="profile-emergency-mobile">Emergency contact mobile</Label>
            <Input id="profile-emergency-mobile" value={emergencyMobile} onChange={(e) => setEmergencyMobile(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save profile details'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
