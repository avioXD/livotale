import { Badge } from '@/components/ui/badge';
import type { AppointmentTimelineEvent, UnifiedTimelineEntry } from '@/types';

interface AppointmentTimelineProps {
  events: AppointmentTimelineEvent[];
  unifiedTimeline?: UnifiedTimelineEntry[];
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AppointmentTimeline({ events, unifiedTimeline }: AppointmentTimelineProps) {
  const rows = unifiedTimeline?.length
    ? unifiedTimeline.map((e) => ({
        key: `${e.occurredAt}-${e.toStatus}`,
        title: e.toStatus.replace(/_/g, ' '),
        description: e.notes ?? e.reason,
        when: e.occurredAt,
        actor: e.actorRole,
      }))
    : events.map((e) => ({
        key: `${e.occurred_at}-${e.title}`,
        title: e.title,
        description: e.description,
        when: e.occurred_at,
        actor: e.actor_role,
      }));

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No timeline events yet.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-6">
      {rows.map((row) => (
        <li key={row.key} className="relative">
          <span className="absolute -left-[1.65rem] top-1.5 h-2.5 w-2.5 rounded-full bg-livotale-pink" />
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium capitalize">{row.title}</p>
            {row.actor && (
              <Badge variant="outline" className="text-xs capitalize">
                {row.actor}
              </Badge>
            )}
          </div>
          {row.description && (
            <p className="mt-1 text-sm text-muted-foreground">{row.description}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{formatWhen(row.when)}</p>
        </li>
      ))}
    </ol>
  );
}
