import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { BodyMapRegion } from '@/types';
import {
  InnoplexusBodyMap,
  organIdsForRegionKey,
  type OrganHighlight,
} from '@/lib/anatomy';

interface AnatomyBodyMapProps {
  readonly regions: BodyMapRegion[];
}

/**
 * Body scan map using Innoplexus human-body-organs-mapping-library (MaleSVG).
 */
export function AnatomyBodyMap({ regions }: AnatomyBodyMapProps) {
  const [active, setActive] = useState<string | null>(regions[0]?.regionId ?? null);

  const activeRegion = regions.find((r) => r.regionId === active) ?? regions[0];

  const highlights = useMemo((): OrganHighlight[] => {
    const items: OrganHighlight[] = [];

    for (const region of regions) {
      const regionKey = region.svgRegion || region.regionId;
      const organIds = organIdsForRegionKey(regionKey);
      const isActive = region.regionId === active;

      for (const organId of organIds) {
        items.push({
          organId,
          fill: region.color,
          opacity: isActive ? 0.88 : 0.62,
          active: isActive,
          onClick: () => setActive(region.regionId),
        });
      }
    }

    return items;
  }, [active, regions]);

  if (!regions.length) {
    return null;
  }

  return (
    <Card className="overflow-hidden border-livotel-teal/30 bg-gradient-to-br from-livotel-teal/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Body Scan Map</CardTitle>
        <p className="text-sm text-muted-foreground">
          Internal organs with clinical results are highlighted by severity. Click an organ or region to inspect.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="mx-auto w-full max-w-[340px] rounded-xl border bg-white p-2 shadow-sm dark:bg-slate-950">
            <InnoplexusBodyMap
              highlights={highlights}
              className="max-h-[460px]"
              ariaLabel="Innoplexus human organ anatomogram"
            />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mapped regions</p>
            {regions.map((region) => (
              <button
                key={region.regionId}
                type="button"
                onClick={() => setActive(region.regionId)}
                className={cn(
                  'w-full rounded-lg border p-3 text-left transition-all',
                  active === region.regionId ? 'border-livotel-pink bg-livotel-pink/5 shadow-sm' : 'hover:bg-muted/40',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: region.color }} />
                  <span className="text-sm font-medium">{region.label}</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {region.metrics.map((m) => (
                    <li key={m.code} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{m.name}: </span>
                      {m.value}
                      {m.unit ? ` ${m.unit}` : ''}
                    </li>
                  ))}
                </ul>
              </button>
            ))}

            {activeRegion && (
              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{activeRegion.label}</span>
                {' · '}
                Organs:{' '}
                <span className="font-medium text-foreground">
                  {organIdsForRegionKey(activeRegion.svgRegion || activeRegion.regionId).join(', ')}
                </span>
                {' · '}
                {activeRegion.metrics.length} measurement{activeRegion.metrics.length === 1 ? '' : 's'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
