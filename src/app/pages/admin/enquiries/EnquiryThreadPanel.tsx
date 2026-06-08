import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';
import { getLatestThreadEnquiry } from '@/utils/enquiryThread';
import type { Enquiry } from '@/types/enquiry';

const DETAIL_PATH = '/admin/enquiries';

interface EnquiryThreadPanelProps {
  threadEnquiries: Enquiry[];
  currentEnquiryId: string;
  onStartNewThread?: () => void;
  startingThread?: boolean;
}

function statusShort(enquiry: Enquiry): string {
  if (enquiry.status === 'converted') {
    if (enquiry.orderOutcome === 'cancelled') return '✕';
    if (enquiry.orderOutcome === 'payment_failed') return '!';
    if (enquiry.orderOutcome === 'defaulter') return '⚠';
    return '✓';
  }
  if (enquiry.status === 'closed') return '—';
  return '●';
}

export function EnquiryThreadPanel({
  threadEnquiries,
  currentEnquiryId,
  onStartNewThread,
  startingThread = false,
}: EnquiryThreadPanelProps) {
  const current = threadEnquiries.find((e) => e.id === currentEnquiryId);
  const latest = getLatestThreadEnquiry(threadEnquiries);
  const hasOpenLaterThread = current
    ? threadEnquiries.some(
        (t) =>
          t.threadSequence > current.threadSequence &&
          t.status !== 'converted' &&
          t.status !== 'closed',
      )
    : false;
  const canStartNew = Boolean(onStartNewThread) && !hasOpenLaterThread;

  if (threadEnquiries.length <= 1 && !canStartNew) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
      <span className="shrink-0 font-medium text-muted-foreground">Thread</span>
      {threadEnquiries.map((t) => {
        const isCurrent = t.id === currentEnquiryId;
        const isLatest = t.id === latest?.id;
        return (
          <Link
            key={t.id}
            to={`${DETAIL_PATH}/${t.id}?tab=view`}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium transition-colors',
              isCurrent
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <span>{statusShort(t)}</span>
            <span>#{t.threadSequence}</span>
            <span className="hidden sm:inline">{t.enquiryNumber.replace('ENQ-2026-', '#')}</span>
            {isLatest && !isCurrent && (
              <Badge variant="outline" className="h-4 px-1 text-[10px]">latest</Badge>
            )}
          </Link>
        );
      })}
      {canStartNew && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={onStartNewThread}
          disabled={startingThread}
        >
          {startingThread ? '…' : '+ New thread'}
        </Button>
      )}
    </div>
  );
}
