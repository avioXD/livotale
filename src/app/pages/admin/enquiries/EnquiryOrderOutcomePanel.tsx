import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EnquiryOrderOutcomeDraft } from '@/store/enquiries';
import type { Enquiry, EnquiryOrderOutcome } from '@/types/enquiry';

const OUTCOMES: { value: EnquiryOrderOutcome; label: string }[] = [
  { value: 'confirmed', label: 'Order confirmed / paid' },
  { value: 'cancelled', label: 'Order cancelled' },
  { value: 'payment_failed', label: 'Payment failed' },
  { value: 'defaulter', label: 'Defaulter (no payment)' },
];

interface EnquiryOrderOutcomePanelProps {
  enquiry: Enquiry;
  outcome: EnquiryOrderOutcomeDraft;
  onChange: (patch: Partial<EnquiryOrderOutcomeDraft>) => void;
  onSave: () => void;
  saving?: boolean;
}

export function EnquiryOrderOutcomePanel({
  enquiry,
  outcome,
  onChange,
  onSave,
  saving = false,
}: EnquiryOrderOutcomePanelProps) {
  return (
    <div className="max-w-xl space-y-4 rounded-lg border bg-card p-4">
      <div>
        <p className="text-sm font-medium">Order outcome</p>
        <p className="text-xs text-muted-foreground">
          Record if the patient cancelled, payment failed, or defaulted after order was created.
        </p>
      </div>

      {enquiry.orderId && (
        <Button size="sm" variant="outline" asChild>
          <Link to={`/admin/orders/${enquiry.orderId}`}>Open order {enquiry.orderId}</Link>
        </Button>
      )}

      <div className="space-y-2">
        <Label htmlFor="order-outcome">Outcome</Label>
        <select
          id="order-outcome"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          value={outcome.orderOutcome}
          onChange={(e) => onChange({ orderOutcome: e.target.value as EnquiryOrderOutcome })}
        >
          {OUTCOMES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="order-outcome-remarks">Remarks</Label>
        <Textarea
          id="order-outcome-remarks"
          rows={2}
          placeholder="Why cancelled, payment gateway error, defaulter follow-up…"
          value={outcome.orderOutcomeRemarks}
          onChange={(e) => onChange({ orderOutcomeRemarks: e.target.value })}
        />
      </div>

      <Button size="sm" onClick={onSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save outcome'}
      </Button>
    </div>
  );
}
