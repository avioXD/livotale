import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EnquiryDetailsDraft } from '@/store/enquiries';
import type { Enquiry } from '@/types/enquiry';
import type { LiverCarePackage } from '@/types/package';

interface EnquiryEditDetailsPanelProps {
  enquiry: Enquiry;
  packages: LiverCarePackage[];
  details: EnquiryDetailsDraft;
  onChange: (patch: Partial<EnquiryDetailsDraft>) => void;
  onSave: () => void;
  saving?: boolean;
}

export function EnquiryEditDetailsPanel({
  enquiry,
  packages,
  details,
  onChange,
  onSave,
  saving = false,
}: EnquiryEditDetailsPanelProps) {
  const sourceLabel =
    enquiry.source === 'website' ? 'Website (auto)' : enquiry.source === 'whatsapp' ? 'WhatsApp (CRM)' : 'Manual';

  return (
    <div className="max-w-xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit lead details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Source: {sourceLabel}. Name and phone are required.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="detail-name">Full name *</Label>
            <Input
              id="detail-name"
              value={details.patientName}
              onChange={(e) => onChange({ patientName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="detail-phone">Phone number *</Label>
            <Input
              id="detail-phone"
              type="tel"
              value={details.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="detail-email">Email</Label>
            <Input
              id="detail-email"
              type="email"
              value={details.email}
              onChange={(e) => onChange({ email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="detail-city">City</Label>
            <Input
              id="detail-city"
              value={details.city}
              onChange={(e) => onChange({ city: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="detail-package">Preferred package</Label>
            <select
              id="detail-package"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={details.preferredPackageId}
              onChange={(e) => onChange({ preferredPackageId: e.target.value })}
            >
              <option value="">None</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="detail-message">Message / notes</Label>
            <Textarea
              id="detail-message"
              rows={3}
              value={details.message}
              onChange={(e) => onChange({ message: e.target.value })}
            />
          </div>
          <Button onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save details'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
