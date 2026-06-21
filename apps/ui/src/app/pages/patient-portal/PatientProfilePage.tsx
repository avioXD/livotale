import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BankDetailsPanel } from '@/app/pages/bank/components/BankDetailsPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { patientPortalService } from '@/services/liverCare';
import { usePatientPortalStore } from '@/store';
import type { PatientProfile } from '@/types/patientPortal';

export function PatientProfilePage() {
  const session = usePatientPortalStore((s) => s.session)!;
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void patientPortalService
      .getProfile(session.phone)
      .then((p) => {
        setProfile(p);
        setEmail(p.email ?? '');
        setCity(p.city ?? '');
        setDateOfBirth(p.dateOfBirth ?? '');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      });
  }, [session.phone]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await patientPortalService.updateProfile(session.phone, {
        email: email.trim() || null,
        city: city.trim() || null,
        dateOfBirth: dateOfBirth || null,
      });
      setProfile(updated);
      setMessage('Profile updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <p className="text-muted-foreground">
        {error ?? 'Loading profile…'}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My profile</h1>
          <p className="text-muted-foreground">Update contact details and refund bank information.</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/patient">Back</Link>
        </Button>
      </div>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal details</CardTitle>
          <CardDescription>Editable: email, city, date of birth</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={profile.name} disabled />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={profile.phone} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of birth</Label>
                <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </form>
        </CardContent>
      </Card>

      <BankDetailsPanel mode="patient" patientPhone={session.phone} />
    </div>
  );
}
