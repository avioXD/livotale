import MaleSVG from 'human-body-organs-mapping-library/src/SVGs/MaleSVG/index.js';
import { maleData } from 'human-body-organs-mapping-library/src/SVGs/OrgansData/data.js';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface OrganHighlight {
  organId: string;
  fill: string;
  opacity: number;
  active?: boolean;
  onClick?: () => void;
}

interface InnoplexusBodyMapProps {
  readonly highlights: OrganHighlight[];
  readonly className?: string;
  readonly ariaLabel?: string;
}

/**
 * Interactive male anatomy map using Innoplexus human-body-organs-mapping-library.
 * Base silhouette from MaleSVG; mapped organs are overlaid with custom colors.
 */
export function InnoplexusBodyMap({
  highlights,
  className,
  ariaLabel = 'Human organ anatomogram',
}: InnoplexusBodyMapProps) {
  const highlightByOrganId = useMemo(() => {
    const map = new Map<string, OrganHighlight>();
    for (const highlight of highlights) {
      map.set(highlight.organId, highlight);
    }
    return map;
  }, [highlights]);

  return (
    <div className={cn('relative mx-auto w-full', className)}>
      <MaleSVG organsArray={[]} />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 106.007 195.363"
        className="pointer-events-none absolute inset-0 h-full w-full"
        role="img"
        aria-label={ariaLabel}
      >
        {maleData.map((organ) => {
          const highlight = highlightByOrganId.get(organ.id);
          if (!highlight) return null;

          return (
            <g
              key={organ.id}
              fill={highlight.fill}
              opacity={highlight.opacity}
              className={cn(
                'pointer-events-auto transition-opacity',
                highlight.onClick && 'cursor-pointer',
              )}
              onClick={highlight.onClick}
              onKeyDown={(event) => {
                if (!highlight.onClick) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  highlight.onClick();
                }
              }}
              role={highlight.onClick ? 'button' : undefined}
              tabIndex={highlight.onClick ? 0 : undefined}
              aria-label={organ.id}
            >
              {organ.path}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
