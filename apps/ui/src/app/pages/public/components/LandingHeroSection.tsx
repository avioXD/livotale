import { ArrowDown } from 'lucide-react';
import { WHATSAPP_MESSAGES } from '@/app/config/whatsappMessages';
import { LandingHealthScanVisual } from '@/app/pages/public/components/LandingHealthScanVisual';
import { LandingPartnerBadge } from '@/app/pages/public/components/LandingPartnerBadge';
import { PublicEnquiryForm } from '@/app/pages/public/components/PublicEnquiryForm';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { Button } from '@/components/ui/button';

export function LandingHeroSection() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden bg-black px-4 py-20">
      <div
        className="pointer-events-none absolute -left-20 -top-40 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #D7316C 0%, transparent 70%)' }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full opacity-15 blur-3xl"
        style={{ background: 'radial-gradient(circle, #1EABB3 0%, transparent 70%)' }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <LandingPartnerBadge />
            <span
              className="inline-block rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white"
              style={{ borderColor: '#1EABB3', background: 'rgba(30,171,179,0.1)' }}
            >
              Liver Fibrosis Scan at Home
            </span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
            <span className="text-livotale-pink">Why</span> Your Liver Needs a{' '}
            <span className="text-livotale-teal">Fibrosis Scan</span>
            <span className="mt-2 block text-3xl font-semibold text-neutral-300 sm:text-4xl lg:text-5xl">
              Before It&apos;s Too Late
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-300 md:text-xl">
            Liver disease shows <strong className="font-semibold text-white">no symptoms</strong> until serious
            damage is done. Fatty liver, fibrosis, and cirrhosis affect millions in India — often undetected until
            it&apos;s irreversible.
          </p>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-400 md:text-lg">
            A <strong className="text-livotale-teal">FibroScan</strong> measures liver stiffness in 10 minutes —
            painless, non-invasive, and the gold standard for detecting fibrosis early. Livotale brings this
            hospital-grade scan to your doorstep.
          </p>

          <ul className="mt-6 space-y-2.5 text-base text-neutral-300 md:text-lg">
            {[
              'Detect fatty liver & fibrosis before symptoms appear',
              'Measure liver stiffness (kPa) without a painful biopsy',
              'Track whether treatment is actually working',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-livotale-teal" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-4">
            <WhatsAppButton size="lg" label="Book a Fibrosis Scan" message={WHATSAPP_MESSAGES.bookScan} />
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/20 bg-transparent text-base text-white hover:bg-white/10"
            >
              <a href="#enquire-form">
                Enquire online
                <ArrowDown className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/20 bg-transparent text-base text-white hover:bg-white/10"
            >
              <a href="#why-fibrosis">
                Why it matters
                <ArrowDown className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>

          <p className="mt-5 text-sm text-neutral-500 md:text-base">
            Free to enquire · Home visit within 48 hours · Results in 24h
          </p>
        </div>

        <div className="flex items-center justify-center">
          <div
            id="enquire-form"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
          >
            <h2 className="text-lg font-semibold text-white">Get a callback</h2>
            <p className="mt-1 text-sm text-neutral-400">Submit your details — we respond within 24 hours.</p>
            <div className="mt-4">
              <PublicEnquiryForm variant="hero" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-white/40">
        <span className="text-xs tracking-widest">SCROLL</span>
        <div className="flex h-8 w-5 items-start justify-center rounded-full border border-white/20 pt-1">
          <div className="landing-scroll-dot h-2 w-1 rounded-full bg-white/40" />
        </div>
      </div>
    </section>
  );
}
