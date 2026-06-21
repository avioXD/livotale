interface LandingSceneSectionProps {
  scene: number;
  title: string;
  description: string;
  quote?: string;
  imageUrl: string;
  reverse?: boolean;
  dark?: boolean;
}

export function LandingSceneSection({
  scene,
  title,
  description,
  quote,
  imageUrl,
  reverse = false,
  dark = false,
}: LandingSceneSectionProps) {
  return (
    <section className={`relative overflow-hidden py-16 md:py-24 ${dark ? 'bg-neutral-950' : 'bg-black'}`}>
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div
          className={`flex flex-col items-center gap-10 md:gap-16 ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'}`}
        >
          <div className="relative flex-1">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/60">
              <img src={imageUrl} alt={title} className="h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute left-4 top-4">
                <span
                  className="rounded-md px-2.5 py-1 font-mono text-xs font-semibold text-white"
                  style={{ background: 'rgba(215,49,108,0.75)', backdropFilter: 'blur(4px)' }}
                >
                  SCENE {String(scene).padStart(2, '0')}
                </span>
              </div>
              <div className="absolute bottom-4 right-4">
                <span className="text-xs font-bold tracking-wider text-livotale-teal">LivoTale</span>
              </div>
            </div>
            <div
              className="absolute -inset-4 -z-10 rounded-3xl opacity-20 blur-2xl"
              style={{ background: 'linear-gradient(135deg, #D7316C, #1EABB3)' }}
              aria-hidden
            />
          </div>

          <div className="flex flex-1 flex-col gap-5">
            <span className="text-sm font-bold uppercase tracking-[0.22em] text-livotale-pink sm:text-base">
              {title}
            </span>
            <p className="border-l-2 border-livotale-teal pl-5 text-base leading-relaxed text-neutral-300 md:text-lg lg:text-xl">
              {description}
            </p>
            {quote && (
              <p className="text-2xl font-bold leading-snug text-white md:text-3xl lg:text-4xl">&ldquo;{quote}&rdquo;</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
