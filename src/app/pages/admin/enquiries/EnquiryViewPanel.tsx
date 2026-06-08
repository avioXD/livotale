import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Enquiry, EnquiryFollowUpLog, EnquiryOrderOutcome } from '@/types/enquiry';

const OUTCOME_LABELS: Record<EnquiryOrderOutcome, string> = {
  confirmed: 'Order confirmed / paid',
  cancelled: 'Order cancelled',
  payment_failed: 'Payment failed',
  defaulter: 'Defaulter',
};

function formatLogTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function FollowUpLogRow({ log }: { log: EnquiryFollowUpLog }) {
  return (
    <div className="rounded border px-3 py-2 text-sm">
      <p className="text-xs text-muted-foreground">
        <span className="font-medium capitalize text-foreground">{log.status.replace(/_/g, ' ')}</span>
        {' · '}
        {formatLogTime(log.createdAt)}
        {log.createdByName ? ` · ${log.createdByName}` : ''}
      </p>
      {log.callRemarks && <p className="mt-1"><span className="text-muted-foreground">Call: </span>{log.callRemarks}</p>}
      {log.internalNotes && <p className="mt-0.5"><span className="text-muted-foreground">Notes: </span>{log.internalNotes}</p>}
    </div>
  );
}

function sourceLabel(source: Enquiry['source']): string {
  if (source === 'website') return 'Website (auto)';
  if (source === 'whatsapp') return 'WhatsApp (CRM)';
  return 'Manual';
}

interface EnquiryViewPanelProps {
  enquiry: Enquiry;
  archived?: boolean;
}

export function EnquiryViewPanel({ enquiry, archived = false }: EnquiryViewPanelProps) {
  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <CardTitle className="text-base">Lead information</CardTitle>
          <Badge variant="outline">{sourceLabel(enquiry.source)}</Badge>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <span className="text-muted-foreground">Name</span>
            <p className="font-medium">{enquiry.patientName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Phone</span>
            <p className="font-medium">{enquiry.phone}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Thread</span>
            <p className="font-medium">#{enquiry.threadSequence}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status</span>
            <p className="font-medium capitalize">
              {enquiry.status.replace(/_/g, ' ')}
              {archived && <span className="text-muted-foreground"> (archived)</span>}
            </p>
          </div>
          {enquiry.orderOutcome && (
            <div>
              <span className="text-muted-foreground">Order outcome</span>
              <p className="font-medium">{OUTCOME_LABELS[enquiry.orderOutcome]}</p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Package interest</span>
            <p className="font-medium">{enquiry.preferredPackageCode ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Email</span>
            <p className="font-medium">{enquiry.email ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">City</span>
            <p className="font-medium">{enquiry.city ?? '—'}</p>
          </div>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Message</span>
            <p className="font-medium">{enquiry.message ?? '—'}</p>
          </div>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Received</span>
            <p className="font-medium">{new Date(enquiry.enquiryAt).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      {enquiry.orderOutcomeRemarks && (
        <Card>
          <CardHeader><CardTitle className="text-base">Order outcome remarks</CardTitle></CardHeader>
          <CardContent className="text-sm">{enquiry.orderOutcomeRemarks}</CardContent>
        </Card>
      )}

      {(enquiry.followUpLogs?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Follow-up log</CardTitle>
            {enquiry.followUpAt && (
              <p className="text-xs text-muted-foreground">
                Next follow-up: {formatLogTime(enquiry.followUpAt)}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {[...(enquiry.followUpLogs ?? [])].reverse().map((log) => (
              <FollowUpLogRow key={log.id} log={log} />
            ))}
          </CardContent>
        </Card>
      )}

      {enquiry.orderId && (
        <Button asChild>
          <Link to={`/admin/orders/${enquiry.orderId}`}>View order</Link>
        </Button>
      )}
    </div>
  );
}
