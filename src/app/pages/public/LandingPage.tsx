import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowDown, Clock, Home, Shield, Stethoscope } from 'lucide-react';
import { WHATSAPP_MESSAGES } from '@/app/config/whatsappMessages';
import { PostAuthRedirect } from '@/app/routes/PostAuthRedirect';
import { LandingPackagesSection } from '@/app/pages/public/components/LandingPackagesSection';
import {
  CONTACT,
  DOCTOR_PROFILE,
  HOW_IT_WORKS_SCENES,
  LANDING_STATS,
  WHY_LIVOTALE_FEATURES,
} from '@/app/pages/public/landingContent';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store';
import { usePublicPackagesStore } from '@/store/packages';

const FEATURE_ICONS = [Home, Clock, Stethoscope, Shield, Activity, Shield] as const;

export function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const packages = usePublicPackagesStore((s) => s.packages);
  const isLoadingList = usePublicPackagesStore((s) => s.isLoadingList);
  const packagesError = usePublicPackagesStore((s) => s.error);
  const fetchPublicList = usePublicPackagesStore((s) => s.fetchPublicList);

  useEffect(() => {
    void fetchPublicList();
  }, [fetchPublicList]);

  if (isAuthenticated) {
    return <PostAuthRedirect />;
  }

  return (
    <div className="-mt-8 space-y-0">
      {/* Hero — full bleed */}
      <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-livotale-pink/8 via-white to-livotale-teal/10" />
        <div
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-livotale-pink/10 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-livotale-teal/15 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:py-20 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="inline-flex items-center rounded-full border border-livotale-pink/20 bg-livotale-pink/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-livotale-pink">
              Healthcare finally came home
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              LiverScan
              <br />
              <span className="bg-gradient-to-r from-livotale-pink to-livotale-teal bg-clip-text text-transparent">
                At Home
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
              Professional liver screening delivered to your door. No queues, no hospitals, no stress — just fast,
              comfortable care from certified specialists.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <WhatsAppButton size="lg" label="Book a Scan" message={WHATSAPP_MESSAGES.bookScan} />
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-livotale-teal/40 text-livotale-teal hover:bg-livotale-teal/5"
              >
                <a href="#packages">
                  See packages
                  <ArrowDown className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Free to enquire · Home visit within 48 hours · Results in 24h
            </p>
          </div>

          {/* Health snapshot card */}
          <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
            <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-2xl shadow-livotale-pink/10 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Sample report</span>
                <span className="rounded-full bg-livotale-teal/10 px-3 py-1 text-xs font-bold text-livotale-teal">
                  SCANNING
                </span>
              </div>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-5xl font-extrabold text-livotale-pink">98</span>
                <span className="mb-2 text-sm font-medium text-slate-500">Health Score</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-700">Liver — Healthy</p>
              <div className="mt-5 space-y-2">
                {[
                  { label: 'ALT', value: '32 U/L', ok: true },
                  { label: 'AST', value: '28 U/L', ok: true },
                  { label: 'Bilirubin', value: '0.8 mg/dL', ok: true },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-600">{row.label}</span>
                    <span className="font-medium text-slate-800">
                      {row.value}
                      {row.ok && <span className="ml-2 text-livotale-teal">✓</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 -z-10 h-full w-full rounded-2xl bg-gradient-to-br from-livotale-pink/20 to-livotale-teal/20" />
          </div>
        </div>
      </section>

      {/* Packages — prominent, right after hero */}
      <LandingPackagesSection
        packages={packages}
        isLoading={isLoadingList}
        error={packagesError}
      />

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {LANDING_STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-100 bg-white p-5 text-center shadow-sm transition hover:border-livotale-teal/30 hover:shadow-md"
            >
              <p
                className={`text-2xl font-extrabold sm:text-3xl ${i % 2 === 0 ? 'text-livotale-pink' : 'text-livotale-teal'}`}
              >
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-livotale-teal">How it works</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">From hospital queues to your living room</h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {HOW_IT_WORKS_SCENES.map((scene) => (
              <div
                key={scene.id}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-livotale-pink/30 hover:shadow-lg"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-livotale-pink to-livotale-teal text-sm font-bold text-white">
                  {scene.number}
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{scene.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{scene.description}</p>
                {'quote' in scene && scene.quote && (
                  <p className="mt-3 border-l-2 border-livotale-teal pl-3 text-sm font-medium italic text-livotale-teal">
                    &ldquo;{scene.quote}&rdquo;
                  </p>
                )}
                <div className="mt-4 h-0.5 w-8 rounded bg-livotale-pink/40 transition-all group-hover:w-16" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-livotale-pink">Why Livotale</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Everything you need. Nothing you don&apos;t.</h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_LIVOTALE_FEATURES.map((feature, i) => {
              const Icon = FEATURE_ICONS[i] ?? Shield;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-100 p-6 transition hover:border-livotale-teal/40 hover:bg-livotale-teal/5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-livotale-pink/10 text-livotale-pink">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-bold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Doctor */}
      <section id="doctor" className="scroll-mt-20 bg-gradient-to-br from-livotale-pink/5 to-livotale-teal/5 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-livotale-teal">Meet your doctor</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">In expert hands, at your doorstep</h2>
          </div>
          <div className="mt-10 overflow-hidden rounded-2xl border border-white bg-white shadow-lg">
            <div className="bg-gradient-to-r from-livotale-pink to-livotale-teal px-6 py-5 text-white">
              <h3 className="text-xl font-bold">{DOCTOR_PROFILE.name}</h3>
              <p className="mt-1 text-sm text-white/80">{DOCTOR_PROFILE.credentials}</p>
            </div>
            <div className="grid gap-8 p-6 md:grid-cols-2">
              <div>
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-livotale-pink">
                  Memberships & Fellowships
                </h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  {DOCTOR_PROFILE.memberships.map((m) => (
                    <li key={m} className="flex gap-2">
                      <span className="text-livotale-teal">•</span>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-livotale-pink">
                  Procedures & Expertise
                </h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  {DOCTOR_PROFILE.procedures.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="text-livotale-teal">•</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
        <div className="bg-gradient-to-r from-livotale-pink to-livotale-teal px-4 py-16 text-center text-white">
          <h2 className="text-2xl font-bold sm:text-4xl">Healthcare finally decided to come home.</h2>
          <p className="mx-auto mt-4 max-w-lg text-white/85">
            Book your scan today. A Livotale healthcare professional will be with you within 48 hours.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <WhatsAppButton
              size="lg"
              label="Book Now — It's Free to Enquire"
              message={WHATSAPP_MESSAGES.bookScan}
              className="bg-white text-livotale-pink shadow-xl hover:bg-white/90 hover:text-livotale-pink"
            />
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/60 bg-transparent text-white hover:bg-white/10"
            >
              <Link to="/packages">Browse packages</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-white/70">No commitment. Cancel anytime.</p>
          <p className="mt-4 text-sm text-white/90">
            <a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`} className="hover:underline">
              {CONTACT.phone}
            </a>
            {' · '}
            <a href={`mailto:${CONTACT.email}`} className="hover:underline">
              {CONTACT.email}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
