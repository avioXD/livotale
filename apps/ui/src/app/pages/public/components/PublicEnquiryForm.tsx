import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { enquiryService, patientPortalService } from '@/services/liverCare';
import { usePublicPackagesStore } from '@/store/packages';
import { usePatientPortalStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { enquiryPrefillFromPatient, type EnquiryPatientPrefill } from '@/utils/patientEnquiryPrefill';

export interface PublicEnquiryFormValues {
  packageCode: string;
  patientName: string;
  phone: string;
  email: string;
  city: string;
  age: string;
  gender: string;
  message: string;
}

interface PublicEnquiryFormProps {
  variant?: 'page' | 'hero';
  initialPackageCode?: string;
  onSuccess?: (enquiry: { id: string; enquiryNumber: string }) => void;
  className?: string;
}

function applyPatientPrefill(
  prefill: EnquiryPatientPrefill,
  setters: {
    setPatientName: Dispatch<SetStateAction<string>>;
    setPhone: Dispatch<SetStateAction<string>>;
    setEmail: Dispatch<SetStateAction<string>>;
    setCity: Dispatch<SetStateAction<string>>;
    setAge: Dispatch<SetStateAction<string>>;
    setGender: Dispatch<SetStateAction<string>>;
  },
): void {
  setters.setPatientName((v) => v || prefill.patientName);
  setters.setPhone((v) => v || prefill.phone);
  if (prefill.email) setters.setEmail((v) => v || prefill.email!);
  if (prefill.city) setters.setCity((v) => v || prefill.city!);
  if (prefill.age) setters.setAge((v) => v || prefill.age!);
  if (prefill.gender) setters.setGender((v) => v || prefill.gender!);
}

export function PublicEnquiryForm({
  variant = 'page',
  initialPackageCode = '',
  onSuccess,
  className,
}: PublicEnquiryFormProps) {
  const navigate = useNavigate();
  const packages = usePublicPackagesStore((s) => s.packages);
  const fetchPublicList = usePublicPackagesStore((s) => s.fetchPublicList);
  const session = usePatientPortalStore((s) => s.session);
  const hydrated = usePatientPortalStore((s) => s.hydrated);
  const hydratePatient = usePatientPortalStore((s) => s.hydrate);
  const isHero = variant === 'hero';

  const [packageCode, setPackageCode] = useState(initialPackageCode);
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydratePatient();
  }, [hydratePatient]);

  useEffect(() => {
    if (packages.length === 0) {
      void fetchPublicList();
    }
  }, [packages.length, fetchPublicList]);

  useEffect(() => {
    if (initialPackageCode) {
      setPackageCode(initialPackageCode);
    }
  }, [initialPackageCode]);

  useEffect(() => {
    if (!hydrated || !session) return;

    let cancelled = false;
    const setters = {
      setPatientName,
      setPhone,
      setEmail,
      setCity,
      setAge,
      setGender,
    };

    applyPatientPrefill(enquiryPrefillFromPatient(session, null), setters);

    void patientPortalService
      .getProfile(session.phone)
      .then((profile) => {
        if (cancelled) return;
        applyPatientPrefill(enquiryPrefillFromPatient(session, profile), setters);
      })
      .catch(() => {
        /* session fields are enough when profile is unavailable */
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, session]);

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
      const parsedAge = age.trim() ? Number(age) : undefined;
      const enquiry = await enquiryService.createPublic({
        patientName: patientName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        age: parsedAge && parsedAge >= 1 ? parsedAge : undefined,
        gender: gender.trim() || undefined,
        preferredPackageId: selectedPkg?.id,
        message: message.trim() || undefined,
      });
      if (onSuccess) {
        onSuccess({ id: enquiry.id, enquiryNumber: enquiry.enquiryNumber });
      } else {
        navigate(`/enquire/thanks?id=${enquiry.id}&number=${enquiry.enquiryNumber}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit enquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const labelClass = isHero ? 'text-neutral-200' : undefined;
  const inputClass = isHero
    ? 'border-white/20 bg-white/5 text-white placeholder:text-neutral-500'
    : undefined;
  const selectClass = cn(
    'flex h-10 w-full rounded-md border px-3 py-2 text-sm',
    isHero
      ? 'border-white/20 bg-white/5 text-white'
      : 'border-input bg-background',
  );

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {error && (
        <div
          className={cn(
            'rounded-md border px-4 py-3 text-sm',
            isHero
              ? 'border-red-400/30 bg-red-500/10 text-red-200'
              : 'border-destructive/30 bg-destructive/10 text-destructive',
          )}
        >
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`${variant}-package`} className={labelClass}>
          Preferred package
        </Label>
        <select
          id={`${variant}-package`}
          className={selectClass}
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

      <div className={cn('grid gap-4', isHero ? 'sm:grid-cols-2' : '')}>
        <div className="space-y-2">
          <Label htmlFor={`${variant}-name`} className={labelClass}>
            Full name *
          </Label>
          <Input
            id={`${variant}-name`}
            className={inputClass}
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${variant}-phone`} className={labelClass}>
            Phone number *
          </Label>
          <Input
            id={`${variant}-phone`}
            type="tel"
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
      </div>

      {!isHero && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${variant}-email`} className={labelClass}>
              Email
            </Label>
            <Input
              id={`${variant}-email`}
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${variant}-city`} className={labelClass}>
              City
            </Label>
            <Input
              id={`${variant}-city`}
              className={inputClass}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${variant}-age`} className={labelClass}>
            Age
          </Label>
          <Input
            id={`${variant}-age`}
            type="number"
            min={1}
            max={120}
            className={inputClass}
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${variant}-gender`} className={labelClass}>
            Gender
          </Label>
          <select
            id={`${variant}-gender`}
            className={selectClass}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Select (optional)</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {!isHero && (
        <div className="space-y-2">
          <Label htmlFor={`${variant}-message`} className={labelClass}>
            Message
          </Label>
          <Textarea
            id={`${variant}-message`}
            className={inputClass}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            rows={3}
          />
        </div>
      )}

      <Button
        type="submit"
        className={cn('w-full', isHero && 'bg-livotale-teal text-white hover:bg-livotale-teal/90')}
        disabled={submitting}
      >
        {submitting ? 'Submitting…' : 'Submit enquiry'}
      </Button>
    </form>
  );
}
