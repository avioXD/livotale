import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { sampleCollectionService } from '@/services/sampleCollection';
import type { AvailableRouteOrder, TechnicianRouteRequest } from '@/types/routeRequest';

interface TechnicianRouteRequestPanelProps {
  date: string;
  onAssigned?: () => void;
}

function formatTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function TechnicianRouteRequestPanel({ date, onAssigned }: TechnicianRouteRequestPanelProps) {
  const [available, setAvailable] = useState<AvailableRouteOrder[]>([]);
  const [requests, setRequests] = useState<TechnicianRouteRequest[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [usingDemo, setUsingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [orders, mine] = await Promise.all([
        sampleCollectionService.listAvailableRouteOrders(date),
        sampleCollectionService.listMyRouteRequests(),
      ]);
      setAvailable(orders);
      setRequests(mine);
      setUsingDemo(orders.some((o) => o.sampleCollectionId.startsWith('demo-route-')));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load available orders');
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitRequest = async (order: AvailableRouteOrder) => {
    setSubmittingId(order.sampleCollectionId);
    setError(null);
    try {
      await sampleCollectionService.requestRoute(
        order.sampleCollectionId,
        notes[order.sampleCollectionId]?.trim() || undefined,
      );
      await load();
      onAssigned?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit route request');
    } finally {
      setSubmittingId(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const recentRequests = requests.filter((r) => r.status !== 'pending').slice(0, 5);

  return (
    <div className="space-y-4">
      {usingDemo && (
        <p className="rounded-md border border-dashed border-livotel-pink/40 bg-livotel-pink/5 px-3 py-2 text-sm text-muted-foreground">
          Demo data — restart API after pulling latest code, run migration 028, then refresh for live route requests.
        </p>
      )}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request a route</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Unassigned orders in your service area for this date. Request routing to you — the operations team will review and assign.
          </p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading available orders…</p>
          ) : available.length === 0 ? (
            <p className="text-sm text-muted-foreground">No unassigned orders in your area for this date.</p>
          ) : (
            <ul className="space-y-3">
              {available.map((order) => {
                const hasPending = Boolean(order.pendingRequestId);
                return (
                  <li key={order.sampleCollectionId} className="rounded-lg border p-3 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{order.patientName ?? 'Patient'}</p>
                        <p className="text-sm text-muted-foreground">
                          {[order.sampleCode, order.patientCode].filter(Boolean).join(' · ')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {[order.line1, order.cityName, order.pincode].filter(Boolean).join(', ')}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatTime(order.scheduledStart)}
                          {order.scheduledEnd ? ` – ${formatTime(order.scheduledEnd)}` : ''}
                          {order.typeName ? ` · ${order.typeName}` : ''}
                        </p>
                      </div>
                      {hasPending ? (
                        <Badge variant="secondary">Request pending</Badge>
                      ) : (
                        <Badge variant="outline">Unassigned</Badge>
                      )}
                    </div>
                    {!hasPending && (
                      <>
                        <Textarea
                          placeholder="Optional note for the team (e.g. nearby stop, preferred slot)"
                          value={notes[order.sampleCollectionId] ?? ''}
                          onChange={(e) =>
                            setNotes((prev) => ({ ...prev, [order.sampleCollectionId]: e.target.value }))
                          }
                          rows={2}
                          className="text-sm"
                        />
                        <Button
                          size="sm"
                          disabled={submittingId === order.sampleCollectionId}
                          onClick={() => void submitRequest(order)}
                        >
                          {submittingId === order.sampleCollectionId ? 'Submitting…' : 'Request this route'}
                        </Button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {(pendingRequests.length > 0 || recentRequests.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My route requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...pendingRequests, ...recentRequests].map((req) => (
              <div key={req.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{req.sampleCode} · {req.patientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(req.requestedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    {req.reviewNote ? ` — ${req.reviewNote}` : ''}
                  </p>
                </div>
                <Badge
                  variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}
                  className="capitalize"
                >
                  {req.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
