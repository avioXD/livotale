import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EnquiryFollowUpDraft } from '@/store/enquiries';
import type { Enquiry, EnquiryFollowUpLog, EnquiryStatus } from '@/types/enquiry';

const STATUSES: EnquiryStatus[] = [
  'new',
  'contacted',
  'interested',
  'follow_up_required',
  'not_interested',
  'closed',
];

function formatLogTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function FollowUpLogItem({ log }: { log: EnquiryFollowUpLog }) {
  return (
    <li className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <span className="font-medium capitalize text-foreground">{log.status.replace(/_/g, ' ')}</span>
        <span>·</span>
        <span>{formatLogTime(log.createdAt)}</span>
        {log.createdByName && (
          <>
            <span>·</span>
            <span>{log.createdByName}</span>
          </>
        )}
        {log.followUpAt && (
          <>
            <span>·</span>
            <span>Next: {formatLogTime(log.followUpAt)}</span>
          </>
        )}
      </div>
      {log.callRemarks && (
        <p className="mt-1">
          <span className="text-muted-foreground">Call: </span>
          {log.callRemarks}
        </p>
      )}
      {log.internalNotes && (
        <p className="mt-0.5">
          <span className="text-muted-foreground">Notes: </span>
          {log.internalNotes}
        </p>
      )}
    </li>
  );
}

interface EnquiryFollowUpNotesPanelProps {
  enquiry: Enquiry;
  followUp: EnquiryFollowUpDraft;
  onChange: (patch: Partial<EnquiryFollowUpDraft>) => void;
  onSave: () => void;
  saving?: boolean;
  disabled?: boolean;
}

export function EnquiryFollowUpNotesPanel({
  enquiry,
  followUp,
  onChange,
  onSave,
  saving = false,
  disabled = false,
}: EnquiryFollowUpNotesPanelProps) {
  const logs = [...(enquiry.followUpLogs ?? [])].reverse();

  return (
    <div className="max-w-3xl space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add follow-up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="enq-status">Status</Label>
              <select
                id="enq-status"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={followUp.status}
                onChange={(e) => onChange({ status: e.target.value as EnquiryStatus })}
                disabled={disabled}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="enq-next">Next follow-up</Label>
              <Input
                id="enq-next"
                type="datetime-local"
                className="h-9"
                value={followUp.followUpAt}
                onChange={(e) => onChange({ followUpAt: e.target.value })}
                disabled={disabled}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="enq-call">Call remarks</Label>
            <Textarea
              id="enq-call"
              rows={2}
              placeholder="What was discussed on the call?"
              value={followUp.callRemarks}
              onChange={(e) => onChange({ callRemarks: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="enq-notes">Internal notes</Label>
            <Textarea
              id="enq-notes"
              rows={2}
              placeholder="Ops notes, callback plan, objections…"
              value={followUp.internalNotes}
              onChange={(e) => onChange({ internalNotes: e.target.value })}
              disabled={disabled}
            />
          </div>
          <Button size="sm" onClick={onSave} disabled={saving || disabled}>
            {saving ? 'Saving…' : 'Add follow-up log'}
          </Button>
        </CardContent>
      </Card>

      {logs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Follow-up history</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {logs.map((log) => (
                <FollowUpLogItem key={log.id} log={log} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
