import MaleSVG from 'human-body-organs-mapping-library/src/SVGs/MaleSVG/index.js';
import { cn } from '@/lib/utils';

interface BodyCompositionFigureProps {
  className?: string;
}

/** Anatomical male body with liver highlighted — human-body-organs-mapping-library */
export function BodyCompositionFigure({ className }: BodyCompositionFigureProps) {
  return (
    <div className={cn('w-[106px] shrink-0', className)} aria-hidden>
      <MaleSVG organsArray={['liver']} />
    </div>
  );
}
