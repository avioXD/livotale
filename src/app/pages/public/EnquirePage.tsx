import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { enquiryService } from '@/services/liverCare';
import { usePublicPackagesStore } from '@/store/packages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function EnquirePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const packages = usePublicPackagesStore((s) => s.packages);
  const fetchPublicList = usePublicPackagesStore((s) => s.fetchPublicList);
  const [packageCode, setPackageCode] = useState(searchParams.get('package') ?? '');
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (packages.length === 0) {
      void fetchPublicList();
    }
  }, [packages.length, fetchPublicList]);

  const selectedPkg = packages.find((p) => p.code === packageCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !phone.trim()) {
      setError('Name and phone are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const enquiry = await enquiryService.createPublic({
        patientName: patientName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        preferredPackageId: selectedPkg?.id,
        message: message.trim() || undefined,
      });
      navigate(`/enquire/thanks?id=${enquiry.id}&number=${enquiry.enquiryNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit enquiry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enquire about Liver Fibrosis Scan</h1>
        <p className="text-muted-foreground">Our operations team will contact you within 24 hours.</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="package">Preferred package</Label>
          <select
            id="package"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={packageCode}
            onChange={(e) => setPackageCode(e.target.value)}
          >
            <option value="">Select a package (optional)</option>
            {packages.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name} — ₹{(p.discountPrice ?? p.price).toLocaleString('en-IN')}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Full name *</Label>
          <Input id="name" value={patientName} onChange={(e) => setPatientName(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone number *</Label>
          <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
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
          <Label htmlFor="message">Message</Label>
          <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit enquiry'}
        </Button>
      </form>
    </div>
  );
}
