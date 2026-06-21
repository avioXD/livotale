import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Accent = 'pink' | 'teal';
type Align = 'left' | 'center';
type Variant = 'bar' | 'centered' | 'split' | 'gradient';

interface LandingSectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  description?: string;
  align?: Align;
  accent?: Accent;
  variant?: Variant;
  className?: string;
}

const ACCENT_TEXT: Record<Accent, string> = {
  pink: 'text-livotale-pink',
  teal: 'text-livotale-teal',
};

const ACCENT_BG: Record<Accent, string> = {
  pink: 'bg-livotale-pink',
  teal: 'bg-livotale-teal',
};

export function LandingSectionHeading({
  eyebrow,
  title,
  subtitle,
  description,
  align = 'left',
  accent = 'pink',
  variant = 'bar',
  className,
}: LandingSectionHeadingProps) {
  const isCenter = align === 'center' || variant === 'centered' || variant === 'gradient';
  const showBarAccent = variant === 'bar' && !isCenter;
  const showCenteredEyebrow = variant === 'centered' || variant === 'gradient' || (isCenter && variant !== 'bar');

  return (
    <div className={cn(isCenter ? 'text-center' : 'text-left', className)}>
      {showCenteredEyebrow ? (
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <span
            className={cn('h-px w-8 bg-gradient-to-r from-transparent sm:w-14', ACCENT_BG[accent])}
            aria-hidden
          />
          <p className={cn('text-base font-extrabold uppercase tracking-[0.18em] sm:text-lg md:text-xl lg:text-2xl', ACCENT_TEXT[accent])}>
            {eyebrow}
          </p>
          <span
            className={cn('h-px w-8 bg-gradient-to-l from-transparent sm:w-14', ACCENT_BG[accent])}
            aria-hidden
          />
        </div>
      ) : (
        <div className={cn('flex items-center gap-3', isCenter && 'justify-center')}>
          {showBarAccent && (
            <span className={cn('h-10 w-1 shrink-0 rounded-full', ACCENT_BG[accent])} aria-hidden />
          )}
          <p className={cn('text-base font-extrabold uppercase tracking-[0.18em] sm:text-lg md:text-xl lg:text-2xl', ACCENT_TEXT[accent])}>
            {eyebrow}
          </p>
        </div>
      )}

      {variant === 'gradient' ? (
        <h2
          className={cn(
            'mx-auto mt-5 max-w-4xl bg-gradient-to-r from-livotale-pink to-livotale-teal bg-clip-text text-3xl font-extrabold leading-[1.12] tracking-tight text-transparent sm:text-4xl lg:text-5xl',
          )}
        >
          {title}
        </h2>
      ) : (
        <h2
          className={cn(
            'mt-4 font-bold leading-snug tracking-tight text-white',
            'text-2xl sm:text-3xl lg:text-4xl',
            isCenter && 'mx-auto max-w-4xl',
          )}
        >
          {title}
          {subtitle && variant === 'split' && (
            <span className="mt-2 block text-xl font-semibold text-neutral-400 sm:text-2xl lg:text-3xl">
              {subtitle}
            </span>
          )}
        </h2>
      )}

      {subtitle && variant !== 'split' && variant !== 'gradient' && (
        <p
          className={cn(
            'mt-3 text-xl font-medium text-neutral-400 sm:text-2xl lg:text-3xl',
            isCenter && 'mx-auto max-w-3xl',
          )}
        >
          {subtitle}
        </p>
      )}

      {description && (
        <p
          className={cn(
            'mt-5 text-lg leading-relaxed text-neutral-300 md:text-xl',
            isCenter ? 'mx-auto max-w-2xl' : 'max-w-3xl',
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
