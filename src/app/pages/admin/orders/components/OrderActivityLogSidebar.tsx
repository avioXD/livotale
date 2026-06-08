import { useEffect, useMemo } from 'react';
import { FiX } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AuditLogEntry } from '@/types/adminDashboard';
import type { OrderTimelineCategory, OrderTimelineEvent } from '@/types/serviceOrder';
import {
  buildActivityLogItems,
  formatPerformer,
  getCategoryStyle,
  type ActivityLogItem,
} from '@/services/liverCare/orderTimeline';

const CATEGORY_LABELS: Record<OrderTimelineCategory | 'audit', string> = {
  order: 'Order',
  payment: 'Payment',
  scan: 'Scan',
  pathology: 'Pathology',
  ai: 'AI',
  report: 'Report',
  consultation: 'Consultation',
  prescription: 'Prescription',
  system: 'System',
  audit: 'Audit',
};

function formatTimestamp(iso: string): { relative: string; full: string } {
  const date = new Date(iso);
  const full = date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  let relative = full;
  if (diffMins < 1) relative = 'Just now';
  else if (diffMins < 60) relative = `${diffMins}m ago`;
  else if (diffHours < 24) relative = `${diffHours}h ago`;
  else if (diffDays < 7) relative = `${diffDays}d ago`;
  return { relative, full };
}

function groupByDate(items: ActivityLogItem[]): { dateLabel: string; items: ActivityLogItem[] }[] {
  const groups = new Map<string, ActivityLogItem[]>();
  for (const item of items) {
    const key = new Date(item.occurredAt).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }
  return [...groups.entries()].map(([dateLabel, groupItems]) => ({ dateLabel, items: groupItems }));
}

interface OrderActivityLogSidebarProps {
  open: boolean;
  onClose: () => void;
  orderNumber: string;
  timeline: OrderTimelineEvent[];
  auditEntries: AuditLogEntry[];
}

export function OrderActivityLogSidebar({
  open,
  onClose,
  orderNumber,
  timeline,
  auditEntries,
}: OrderActivityLogSidebarProps) {
  const items = useMemo(() => buildActivityLogItems(timeline, auditEntries), [timeline, auditEntries]);
  const grouped = useMemo(() => groupByDate(items), [items]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/30"
        aria-label="Close activity log"
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l bg-background shadow-xl"
        aria-label="Order activity log"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Activity log</p>
            <p className="text-xs text-muted-foreground">
              {orderNumber} · {items.length} event{items.length === 1 ? '' : 's'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <FiX className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <div key={group.dateLabel}>
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {group.dateLabel}
                  </p>
                  <ul className="relative space-y-0 border-l border-border pl-4">
                    {group.items.map((item) => {
                      const ts = formatTimestamp(item.occurredAt);
                      const category = item.category ?? 'system';
                      const dotClass = category === 'audit' ? 'bg-muted-foreground' : getCategoryStyle(category as OrderTimelineCategory);
                      const performer = formatPerformer(item.performedBy);

                      return (
                        <li key={item.id} className="relative pb-4 last:pb-0">
                          <span
                            className={`absolute -left-[calc(0.5rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-background ${dotClass}`}
                            aria-hidden
                          />
                          <div className="rounded-md border bg-card px-3 py-2.5 text-sm shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="font-medium leading-snug">{item.title}</p>
                              <div className="flex shrink-0 gap-1">
                                <Badge variant="secondary" className="text-[10px] capitalize">
                                  {CATEGORY_LABELS[category]}
                                </Badge>
                                {item.source === 'audit' && (
                                  <Badge variant="outline" className="text-[10px]">
                                    Audit trail
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {item.detail && (
                              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                            )}

                            {item.metadata && Object.keys(item.metadata).length > 0 && (
                              <dl className="mt-2 flex flex-wrap gap-1.5">
                                {Object.entries(item.metadata).map(([key, value]) => (
                                  <div
                                    key={key}
                                    className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                  >
                                    <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
                                    {value}
                                  </div>
                                ))}
                              </dl>
                            )}

                            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                              <time dateTime={item.occurredAt} title={ts.full}>
                                {ts.relative}
                              </time>
                              <span aria-hidden>·</span>
                              <span>{ts.full}</span>
                              {performer && (
                                <>
                                  <span aria-hidden>·</span>
                                  <span>By {performer}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
