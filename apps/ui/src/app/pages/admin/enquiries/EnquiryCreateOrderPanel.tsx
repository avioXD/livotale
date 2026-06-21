import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { isPatientIntakeValid, PatientIntakeForm } from '@/app/pages/shared/components/PatientIntakeForm';
import type { EnquiryFollowUpDraft } from '@/store/enquiries';
import type { Enquiry } from '@/types/enquiry';
import type { LiverCarePackage } from '@/types/package';
import type { ScanPatientIntakeInput } from '@/types/scanPatientIntake';
import { orgPath } from '@/app/config/orgRoutes';

interface EnquiryCreateOrderPanelProps {
  enquiry: Enquiry;
  packages: LiverCarePackage[];
  followUp: EnquiryFollowUpDraft;
  orderIntake: ScanPatientIntakeInput;
  onChange: (patch: Partial<EnquiryFollowUpDraft>) => void;
  onIntakeChange: (patch: Partial<ScanPatientIntakeInput>) => void;
  onConvert: () => void;
  converting?: boolean;
}

export function EnquiryCreateOrderPanel({
  enquiry,
  packages,
  followUp,
  orderIntake,
  onChange,
  onIntakeChange,
  onConvert,
  converting = false,
}: EnquiryCreateOrderPanelProps) {
  const isConverted = enquiry.status === 'converted';
  const reusesPatient = Boolean(enquiry.patientId);
  const intakeValid = isPatientIntakeValid(orderIntake);

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="text-base">Create order</CardTitle>
        <p className="text-sm text-muted-foreground">
          Book a liver care package for this lead. Enter patient details now — the field technician will see them
          after payment, when the home visit is scheduled.
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
                <Link to={orgPath(`/admin/orders/${enquiry.orderId}`)}>Open previous order</Link>
              </Button>
            )}
          </div>
        )}
        {!isConverted && (
          <p className="text-xs text-muted-foreground">
            After payment, operations or the patient can schedule the fibrosis scan home visit from the order detail
            page.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
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

        <div className="space-y-3 rounded-md border bg-muted/20 p-4">
          <div>
            <p className="text-sm font-medium">Patient details</p>
            <p className="text-xs text-muted-foreground">
              Required at order creation. Weight, height, and comorbidities are optional but help the technician
              prepare for the visit.
            </p>
          </div>
          <PatientIntakeForm
            idPrefix="create-order"
            value={orderIntake}
            onChange={(next) => onIntakeChange(next)}
          />
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

        <Button
          onClick={onConvert}
          disabled={converting || !followUp.preferredPackageId || !intakeValid}
        >
          {converting ? 'Creating order…' : 'Create order'}
        </Button>
      </CardContent>
    </Card>
  );
}
