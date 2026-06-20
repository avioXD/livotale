import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CreateEnquiryInput, EnquirySource } from '@/types/enquiry';
import type { LiverCarePackage } from '@/types/package';

interface EnquiryLeadFormPanelProps {
  packages: LiverCarePackage[];
  saving?: boolean;
  onSubmit: (input: CreateEnquiryInput) => void;
  onCancel: () => void;
}

export function EnquiryLeadFormPanel({ packages, saving = false, onSubmit, onCancel }: EnquiryLeadFormPanelProps) {
  const [source, setSource] = useState<EnquirySource>('whatsapp');
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [message, setMessage] = useState('');
  const [preferredPackageId, setPreferredPackageId] = useState('');

  const handleSubmit = () => {
    const parsedAge = age.trim() ? Number(age) : undefined;
    onSubmit({
      source,
      patientName,
      phone,
      email: email.trim() || undefined,
      city: city.trim() || undefined,
      address: address.trim() || undefined,
      age: parsedAge && parsedAge >= 1 ? parsedAge : undefined,
      gender: gender.trim() || undefined,
      message: message.trim() || undefined,
      preferredPackageId: preferredPackageId || undefined,
    });
  };

  return (
    <div className="max-w-xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead details</CardTitle>
          <p className="text-sm text-muted-foreground">Name and phone are required. Use WhatsApp for manual CRM entry.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lead-source">Source</Label>
            <select
              id="lead-source"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={source}
              onChange={(e) => setSource(e.target.value as EnquirySource)}
            >
              <option value="whatsapp">WhatsApp (manual CRM)</option>
              <option value="manual">Manual / phone call</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-name">Full name *</Label>
            <Input id="lead-name" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Patient name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-phone">Phone number *</Label>
            <Input id="lead-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
          </div>
          <Button type="button" variant="ghost" size="sm" className="px-0" onClick={() => setShowMore((v) => !v)}>
            {showMore ? 'Hide' : 'Show'} additional fields
          </Button>
          {showMore && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lead-age">Age</Label>
                  <Input id="lead-age" type="number" min={1} max={120} value={age} onChange={(e) => setAge(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-gender">Gender</Label>
                  <select
                    id="lead-gender"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">Not specified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-package">Preferred package</Label>
                <select
                  id="lead-package"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={preferredPackageId}
                  onChange={(e) => setPreferredPackageId(e.target.value)}
                >
                  <option value="">None</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-email">Email</Label>
                <Input id="lead-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-city">City</Label>
                <Input id="lead-city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-address">Address</Label>
                <Textarea id="lead-address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-message">Notes / message</Label>
                <Textarea id="lead-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Add lead'}</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
