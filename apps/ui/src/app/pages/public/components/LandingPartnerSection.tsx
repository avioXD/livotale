import { LANDING_ASSETS, LIVGASTRO_PARTNER } from '@/app/pages/public/landingContent';

export function LandingPartnerSection() {
  return (
    <section className="border-y border-white/10 bg-black py-10 md:py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 sm:px-6 md:flex-row md:justify-center md:gap-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-neutral-400">Partnered with</p>
        <a
          href={LIVGASTRO_PARTNER.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-2 rounded-xl px-4 py-2 transition hover:bg-white/[0.03]"
          aria-label={`Visit ${LIVGASTRO_PARTNER.name} website`}
        >
          <img
            src={LANDING_ASSETS.livgastroLogo}
            alt={LIVGASTRO_PARTNER.name}
            className="h-10 w-auto object-contain transition group-hover:opacity-90 md:h-12"
          />
          <span className="text-xs text-neutral-500 transition group-hover:text-neutral-400">
            {LIVGASTRO_PARTNER.tagline}
          </span>
        </a>
      </div>
    </section>
  );
}
