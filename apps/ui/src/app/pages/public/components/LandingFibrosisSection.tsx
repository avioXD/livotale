import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { LandingSectionHeading } from '@/app/pages/public/components/LandingSectionHeading';
import { FIBROSIS_BENEFITS, LIVER_DISEASES } from '@/app/pages/public/landingContent';

export function LandingFibrosisSection() {
  return (
    <>
      <section id="why-fibrosis" className="scroll-mt-20 bg-neutral-950 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <LandingSectionHeading
            variant="bar"
            accent="pink"
            eyebrow="Why FibroScan?"
            title="Liver disease is silent."
            subtitle="A fibrosis scan speaks for your liver."
            description="In India, rising diabetes, obesity, alcohol use, and viral hepatitis mean fatty liver and fibrosis are at epidemic levels. Most people discover liver damage only when jaundice, swelling, or cancer appear — by then, options are limited."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LIVER_DISEASES.map((disease) => (
              <div
                key={disease.title}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-livotale-pink/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-livotale-pink" aria-hidden />
                  <span className="rounded-full bg-livotale-pink/10 px-2.5 py-0.5 text-xs font-medium text-livotale-pink">
                    {disease.severity}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-white md:text-xl">{disease.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-neutral-400">{disease.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="benefits" className="scroll-mt-20 bg-black py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <LandingSectionHeading
            variant="centered"
            accent="teal"
            align="center"
            eyebrow="Benefits"
            title="Why a home fibrosis scan is essential today"
            description="Preventive liver screening is no longer a hospital-only luxury. Here is what you gain."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FIBROSIS_BENEFITS.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-2xl border border-white/10 p-6 transition hover:border-livotale-teal/40 hover:bg-livotale-teal/5"
              >
                <ShieldCheck className="h-6 w-6 text-livotale-teal" aria-hidden />
                <h3 className="mt-4 text-lg font-bold text-white md:text-xl">{benefit.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-neutral-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
