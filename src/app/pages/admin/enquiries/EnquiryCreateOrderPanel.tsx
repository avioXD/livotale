import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EnquiryFollowUpDraft } from '@/store/enquiries';
import type { Enquiry } from '@/types/enquiry';
import type { LiverCarePackage } from '@/types/package';

interface EnquiryCreateOrderPanelProps {
  enquiry: Enquiry;
  packages: LiverCarePackage[];
  followUp: EnquiryFollowUpDraft;
  onChange: (patch: Partial<EnquiryFollowUpDraft>) => void;
  onConvert: () => void;
  converting?: boolean;
}

export function EnquiryCreateOrderPanel({
  enquiry,
  packages,
  followUp,
  onChange,
  onConvert,
  converting = false,
}: EnquiryCreateOrderPanelProps) {
  const isConverted = enquiry.status === 'converted';
  const reusesPatient = Boolean(enquiry.patientId);

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="text-base">Create order</CardTitle>
        <p className="text-sm text-muted-foreground">
          Book a liver care package order for this lead. You will be taken to the order detail after creation.
        </p>
        {isConverted && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="secondary">Converted</Badge>
            {reusesPatient && (
              <span className="text-xs text-muted-foreground">
                Existing patient linked — patient creation will be skipped for this order.
              </span>
            )}
            {enquiry.orderId && (
              <Button size="sm" variant="outline" asChild>
                <Link to={`/admin/orders/${enquiry.orderId}`}>Open previous order</Link>
              </Button>
            )}
          </div>
        )}
        {!isConverted && (
          <p className="text-xs text-muted-foreground">
            First order from this enquiry will create a new patient record from the lead details.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="enq-pkg">Package</Label>
          <select
            id="enq-pkg"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={followUp.preferredPackageId}
            onChange={(e) => onChange({ preferredPackageId: e.target.value })}
          >
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — ₹{(p.discountPrice ?? p.price).toLocaleString('en-IN')}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3 rounded-md border bg-muted/20 p-3">
          <p className="text-xs font-medium text-muted-foreground">Follow-up notes (optional)</p>
          <div className="space-y-2">
            <Label htmlFor="order-call-remarks">Call remarks</Label>
            <Textarea
              id="order-call-remarks"
              rows={2}
              placeholder="Discussion before placing order…"
              value={followUp.callRemarks}
              onChange={(e) => onChange({ callRemarks: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="order-internal-notes">Internal notes</Label>
            <Textarea
              id="order-internal-notes"
              rows={2}
              placeholder="Ops context — saved to follow-up log with the order"
              value={followUp.internalNotes}
              onChange={(e) => onChange({ internalNotes: e.target.value })}
            />
          </div>
        </div>

        <Button onClick={onConvert} disabled={converting || !followUp.preferredPackageId}>
          {converting ? 'Creating order…' : 'Create order'}
        </Button>
      </CardContent>
    </Card>
  );
}
