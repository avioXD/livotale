import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { EntityDetailShell } from '@/components/common/EntityDetailShell';
import { orgPath } from '@/app/config/orgRoutes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceZoneFormPanel } from './components/ServiceZoneFormPanel';
import { useServiceZonesStore } from '@/store';
import { serviceZoneService } from '@/services/orgScope';
import type { CreateServiceZoneInput, ServiceZone } from '@/types/serviceZone';

const LIST_PATH = orgPath('/admin/service-zones');

export function AdminServiceZoneDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isCreate = id === 'new';

  const zones = useServiceZonesStore((s) => s.zones);
  const isLoadingList = useServiceZonesStore((s) => s.isLoading);
  const isLoaded = useServiceZonesStore((s) => s.isLoaded);
  const storeError = useServiceZonesStore((s) => s.error);
  const fetchZones = useServiceZonesStore((s) => s.fetchZones);
  const upsertZone = useServiceZonesStore((s) => s.upsertZone);
  const removeZone = useServiceZonesStore((s) => s.removeZone);

  const [zone, setZone] = useState<ServiceZone | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    if (!isLoaded) {
      fetchZones().catch(() => undefined);
    }

    if (isCreate) {
      setZone(null);
      setActionError(null);
      setIsLoading(false);
      return;
    }

    const existing = zones.find((item) => item.id === id);
    if (existing) {
      setZone(existing);
      setActionError(null);
      setIsLoading(false);
      return;
    }

    if (!isLoaded) return;

    let cancelled = false;
    setIsLoading(true);
    setActionError(null);

    serviceZoneService
      .getById(id)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setZone(null);
          return;
        }
        upsertZone(result);
        setZone(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setActionError(err instanceof Error ? err.message : 'Failed to load service zone');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchZones, id, isCreate, isLoaded, upsertZone, zones]);

  const effectiveError = actionError ?? storeError;

  const handleSubmit = async (input: CreateServiceZoneInput) => {
    if (!isCreate && !id) return;
    setSaving(true);
    setActionError(null);
    try {
      const saved = isCreate ? await serviceZoneService.create(input) : await serviceZoneService.update(id, input);
      upsertZone(saved);
      setZone(saved);
      navigate(`${LIST_PATH}/${saved.id}?tab=view`, { replace: true });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save service zone');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!zone || !globalThis.confirm(`Remove ${zone.city} and its ${zone.pincodes.length} pincode(s)?`)) return;
    setActionError(null);
    try {
      await serviceZoneService.remove(zone.id);
      removeZone(zone.id);
      navigate(LIST_PATH);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove service zone');
    }
  };

  const description = useMemo(() => {
    if (isCreate) return 'Create a new service zone with its city, state, and serviced pincodes.';
    if (!zone) return 'Review serviceability and update the city coverage details.';
    return `${zone.state} • ${zone.pincodes.length} serviced pincode(s)`;
  }, [isCreate, zone]);

  if (!id) return <Navigate to={LIST_PATH} replace />;

  if ((isLoadingList && !isLoaded) || isLoading) {
    return <p className="text-muted-foreground">Loading service zone…</p>;
  }

  if (!isCreate && !zone) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Service zone not found.</p>
        <Button variant="outline" asChild>
          <Link to={LIST_PATH}>Back to service zones</Link>
        </Button>
      </div>
    );
  }

  return (
    <EntityDetailShell
      backTo={LIST_PATH}
      backLabel="Back to service zones"
      title={isCreate ? 'New service zone' : zone!.city}
      description={description}
      createMode={isCreate}
      actions={
        !isCreate && zone ? (
          <Button variant="destructive" size="sm" onClick={() => void handleDelete()}>
            Delete
          </Button>
        ) : undefined
      }
      viewContent={
        zone ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={zone.active ? 'default' : 'outline'}>{zone.active ? 'Active' : 'Inactive'}</Badge>
              <Badge variant="secondary">{zone.state}</Badge>
              <Badge variant="outline">{zone.pincodes.length} pincodes</Badge>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Coverage details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">City</p>
                    <p className="font-medium">{zone.city}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">State</p>
                    <p className="font-medium">{zone.state}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Serviced pincodes</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {zone.pincodes.map((pin) => (
                      <Badge key={pin} variant="outline" className="font-mono text-xs">
                        {pin}
                      </Badge>
                    ))}
                  </div>
                </div>

                {zone.notes && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap text-sm">{zone.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null
      }
      editContent={
        <div className="space-y-4">
          {effectiveError && <p className="text-sm text-destructive">{effectiveError}</p>}
          <ServiceZoneFormPanel
            zone={zone}
            saving={saving}
            onSubmit={(input) => void handleSubmit(input)}
            onCancel={() => navigate(isCreate ? LIST_PATH : `${LIST_PATH}/${id}?tab=view`)}
          />
        </div>
      }
    />
  );
}
