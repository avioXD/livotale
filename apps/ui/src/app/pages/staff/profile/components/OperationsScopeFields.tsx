import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import type { ServiceZone } from '@/types/serviceZone';

interface OperationsScopeFieldsProps {
  serviceZones: ServiceZone[];
  assignedServiceZoneIds: string[];
  assignedPincodes: string[];
  cityManagerServiceZoneIds: string[];
  disabled?: boolean;
  onChange: (next: {
    assignedServiceZoneIds: string[];
    assignedPincodes: string[];
    cityManagerServiceZoneIds: string[];
  }) => void;
}

function chipClass(selected: boolean, disabled?: boolean) {
  return `rounded-full border px-3 py-1 text-sm transition-colors ${
    selected
      ? 'border-livotale-pink bg-livotale-pink/10 text-foreground'
      : 'border-border text-muted-foreground hover:bg-muted/40'
  } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`;
}

export function OperationsScopeFields({
  serviceZones,
  assignedServiceZoneIds,
  assignedPincodes,
  cityManagerServiceZoneIds,
  disabled = false,
  onChange,
}: OperationsScopeFieldsProps) {
  const activeZones = useMemo(
    () => serviceZones.filter((zone) => zone.active).sort((a, b) => a.city.localeCompare(b.city)),
    [serviceZones],
  );

  const selectedZones = useMemo(
    () => activeZones.filter((zone) => assignedServiceZoneIds.includes(zone.id)),
    [activeZones, assignedServiceZoneIds],
  );

  const availablePincodes = useMemo(() => {
    const zones = selectedZones.length > 0 ? selectedZones : activeZones;
    return [...new Set(zones.flatMap((zone) => zone.pincodes))].sort((a, b) => a.localeCompare(b));
  }, [activeZones, selectedZones]);

  const toggleZone = (zoneId: string) => {
    const selected = assignedServiceZoneIds.includes(zoneId);
    const nextZoneIds = selected
      ? assignedServiceZoneIds.filter((id) => id !== zoneId)
      : [...assignedServiceZoneIds, zoneId];
    const zone = activeZones.find((item) => item.id === zoneId);
    const nextPincodes = selected
      ? assignedPincodes.filter((pin) => !(zone?.pincodes ?? []).includes(pin))
      : assignedPincodes;
    const nextCityManagerZoneIds = cityManagerServiceZoneIds.filter((id) => nextZoneIds.includes(id));
    onChange({
      assignedServiceZoneIds: nextZoneIds,
      assignedPincodes: nextPincodes,
      cityManagerServiceZoneIds: nextCityManagerZoneIds,
    });
  };

  const togglePincode = (pincode: string) => {
    const selected = assignedPincodes.includes(pincode);
    onChange({
      assignedServiceZoneIds,
      assignedPincodes: selected
        ? assignedPincodes.filter((pin) => pin !== pincode)
        : [...assignedPincodes, pincode],
      cityManagerServiceZoneIds,
    });
  };

  const toggleCityManagerZone = (zoneId: string) => {
    const selected = cityManagerServiceZoneIds.includes(zoneId);
    onChange({
      assignedServiceZoneIds,
      assignedPincodes,
      cityManagerServiceZoneIds: selected
        ? cityManagerServiceZoneIds.filter((id) => id !== zoneId)
        : [...cityManagerServiceZoneIds, zoneId],
    });
  };

  if (activeZones.length === 0) {
    return (
      <div className="sm:col-span-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
        No active service zones configured. Add zones under Organization configuration → Service zones first.
      </div>
    );
  }

  return (
    <>
      <div className="sm:col-span-2">
        <Label>Service zones</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          Select one or more service zones this operations staff member can work in.
        </p>
        <div className="flex flex-wrap gap-2">
          {activeZones.map((zone) => {
            const selected = assignedServiceZoneIds.includes(zone.id);
            return (
              <button
                key={zone.id}
                type="button"
                disabled={disabled}
                onClick={() => toggleZone(zone.id)}
                className={chipClass(selected, disabled)}
              >
                {zone.city}
                {zone.state ? `, ${zone.state}` : ''}
                <span className="ml-1 text-xs text-muted-foreground">({zone.pincodes.length})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="sm:col-span-2">
        <Label>Assigned pincodes</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          Select pincodes from {selectedZones.length > 0 ? 'the chosen service zones' : 'all active service zones'}.
          {assignedPincodes.length > 0 ? ` ${assignedPincodes.length} selected.` : ''}
        </p>
        <div className="max-h-48 overflow-y-auto rounded-md border p-2">
          <div className="flex flex-wrap gap-1.5">
            {availablePincodes.map((pincode) => {
              const selected = assignedPincodes.includes(pincode);
              return (
                <button
                  key={pincode}
                  type="button"
                  disabled={disabled}
                  onClick={() => togglePincode(pincode)}
                  className={chipClass(selected, disabled)}
                >
                  {pincode}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="sm:col-span-2">
        <Label>City manager promotion</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          Select service zones where this staff member is promoted to city manager. They gain city-wide control for those zones.
        </p>
        {selectedZones.length === 0 ? (
          <p className="text-sm text-muted-foreground">Select at least one service zone first.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedZones.map((zone) => {
              const selected = cityManagerServiceZoneIds.includes(zone.id);
              return (
                <button
                  key={zone.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleCityManagerZone(zone.id)}
                  className={chipClass(selected, disabled)}
                >
                  {zone.city}
                  {selected ? ' · city manager' : ''}
                </button>
              );
            })}
          </div>
        )}
        {cityManagerServiceZoneIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {cityManagerServiceZoneIds.map((zoneId) => {
              const zone = selectedZones.find((item) => item.id === zoneId);
              if (!zone) return null;
              return (
                <Badge key={zoneId} variant="secondary">
                  {zone.city} city manager
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
