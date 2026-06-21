import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Clock, Home, Shield, Stethoscope } from 'lucide-react';
import { WHATSAPP_MESSAGES } from '@/app/config/whatsappMessages';
import { LandingDoctorSection } from '@/app/pages/public/components/LandingDoctorSection';
import { LandingFibrosisSection } from '@/app/pages/public/components/LandingFibrosisSection';
import { LandingHeroSection } from '@/app/pages/public/components/LandingHeroSection';
import { LandingLoginSection } from '@/app/pages/public/components/LandingLoginSection';
import { LandingPackagesSection } from '@/app/pages/public/components/LandingPackagesSection';
import { LandingPartnerSection } from '@/app/pages/public/components/LandingPartnerSection';
import { LandingSectionHeading } from '@/app/pages/public/components/LandingSectionHeading';
import { LandingSceneSection } from '@/app/pages/public/components/LandingSceneSection';
import {
  CONTACT,
  HOW_IT_WORKS_SCENES,
  LANDING_STATS,
  WHY_LIVOTALE_FEATURES,
} from '@/app/pages/public/landingContent';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { Button } from '@/components/ui/button';
import { usePublicPackagesStore } from '@/store/packages';

const FEATURE_ICONS = [Home, Clock, Stethoscope, Shield, Activity, Shield] as const;

export function LandingPage() {
  const packages = usePublicPackagesStore((s) => s.packages);
  const isLoadingList = usePublicPackagesStore((s) => s.isLoadingList);
  const packagesError = usePublicPackagesStore((s) => s.error);
  const fetchPublicList = usePublicPackagesStore((s) => s.fetchPublicList);

  useEffect(() => {
    void fetchPublicList();
  }, [fetchPublicList]);

  return (
    <div className="bg-black text-white">
      <LandingHeroSection />

      <LandingFibrosisSection />

      <LandingPackagesSection packages={packages} isLoading={isLoadingList} error={packagesError} />

      {/* Stats */}
      <section className="bg-gradient-to-r from-livotale-pink to-livotale-teal py-12 md:py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-6">
          {LANDING_STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-extrabold text-white md:text-4xl lg:text-5xl">{stat.value}</p>
              <p className="mt-1 text-sm font-medium text-white/85 md:text-base">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20">
        <div className="bg-black px-4 py-12 sm:px-6 md:py-16">
          <LandingSectionHeading
            variant="centered"
            accent="teal"
            align="center"
            eyebrow="How it works"
            title="From hospital queues to your living room"
            description="Five simple steps to understanding your liver health — without leaving home."
          />
        </div>
        {HOW_IT_WORKS_SCENES.map((scene, i) => (
          <LandingSceneSection
            key={scene.id}
            scene={i + 1}
            title={scene.title}
            description={scene.description}
            quote={'quote' in scene ? scene.quote : undefined}
            imageUrl={scene.imageUrl}
            reverse={i % 2 === 1}
            dark={i % 2 === 0}
          />
        ))}
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 bg-black py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <LandingSectionHeading
            variant="centered"
            accent="pink"
            align="center"
            eyebrow="Why Livotale"
            title="Everything you need for liver fibrosis screening"
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_LIVOTALE_FEATURES.map((feature, i) => {
              const Icon = FEATURE_ICONS[i] ?? Shield;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-white/10 p-6 transition hover:border-livotale-teal/40 hover:bg-livotale-teal/5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-livotale-pink/10 text-livotale-pink">
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-white md:text-xl">{feature.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-neutral-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <LandingDoctorSection />

      <LandingPartnerSection />

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-neutral-950 py-16 md:py-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background:
              'radial-gradient(circle at 30% 50%, #D7316C 0%, transparent 50%), radial-gradient(circle at 70% 50%, #1EABB3 0%, transparent 50%)',
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <LandingSectionHeading
            variant="gradient"
            accent="pink"
            align="center"
            eyebrow="Get started"
            title="Book your liver fibrosis scan today."
            description="A certified gastroenterologist will visit your home within 48 hours. Free to enquire — no commitment."
          />
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <WhatsAppButton
              size="lg"
              label="Book Now on WhatsApp"
              message={WHATSAPP_MESSAGES.bookScan}
              className="shadow-xl"
            />
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              <Link to="/packages">Browse packages</Link>
            </Button>
          </div>
          <p className="mt-6 text-base text-neutral-400">
            <a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`} className="text-livotale-teal hover:underline">
              {CONTACT.phone}
            </a>
            {' · '}
            <a href={`mailto:${CONTACT.email}`} className="text-livotale-teal hover:underline">
              {CONTACT.email}
            </a>
          </p>
          <p className="mt-2 text-sm text-neutral-500">{CONTACT.hours}</p>
        </div>
      </section>

      <LandingLoginSection />
    </div>
  );
}
