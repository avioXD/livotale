import { LANDING_ASSETS, LIVGASTRO_PARTNER } from '@/app/pages/public/landingContent';
import { cn } from '@/lib/utils';

interface LandingPartnerBadgeProps {
  className?: string;
}

export function LandingPartnerBadge({ className }: LandingPartnerBadgeProps) {
  return (
    <a
      href={LIVGASTRO_PARTNER.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 backdrop-blur-sm transition hover:border-livotale-teal/35 hover:bg-white/[0.07]',
        className,
      )}
      aria-label={`Visit ${LIVGASTRO_PARTNER.name} website`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 sm:text-xs">
        Partnered with
      </span>
      <span className="hidden h-4 w-px bg-white/15 sm:block" aria-hidden />
      <img
        src={LANDING_ASSETS.livgastroLogo}
        alt={LIVGASTRO_PARTNER.name}
        className="h-5 w-auto object-contain transition group-hover:opacity-90 sm:h-6"
      />
    </a>
  );
}
