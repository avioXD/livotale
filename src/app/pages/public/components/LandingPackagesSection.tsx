import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { LandingSectionHeading } from '@/app/pages/public/components/LandingSectionHeading';
import { PublicPackageCard } from '@/app/pages/public/components/PublicPackageCard';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { WHATSAPP_MESSAGES } from '@/app/config/whatsappMessages';
import { Button } from '@/components/ui/button';
import type { LiverCarePackage } from '@/types/package';

interface LandingPackagesSectionProps {
  packages: LiverCarePackage[];
  isLoading: boolean;
  error: string | null;
}

export function LandingPackagesSection({ packages, isLoading, error }: LandingPackagesSectionProps) {
  const recommended = packages.find((p) => p.recommendedTag);

  return (
    <section id="packages" className="relative scroll-mt-20">
      {/* Full-bleed gradient band */}
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, #D7316C 0%, transparent 50%), radial-gradient(circle at 80% 50%, #1EABB3 0%, transparent 50%)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <LandingSectionHeading
              variant="bar"
              accent="teal"
              eyebrow="Choose your package"
              title={
                <>
                  Liver fibrosis scan packages
                  <span className="text-livotale-pink"> at your doorstep</span>
                </>
              }
              description="Compare FibroScan plans, see every test included, and book in one tap on WhatsApp — no hospital visit required."
            />
            <WhatsAppButton
              label="Get a free quote"
              message={WHATSAPP_MESSAGES.bookScan}
              className="shrink-0 shadow-lg"
            />
          </div>

          <div className="mt-12">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-300">
                <Loader2 className="h-5 w-5 animate-spin text-livotale-teal" />
                Loading packages…
              </div>
            ) : error ? (
              <p className="rounded-xl bg-red-500/10 px-4 py-6 text-center text-red-300">{error}</p>
            ) : packages.length === 0 ? (
              <p className="text-center text-slate-400">No packages available right now.</p>
            ) : (
              <div className="grid items-stretch gap-6 lg:grid-cols-3">
                {packages.map((pkg) => (
                  <PublicPackageCard
                    key={pkg.id}
                    pkg={pkg}
                    featured={pkg.id === recommended?.id}
                  />
                ))}
              </div>
            )}
          </div>

          {packages.length > 0 && (
            <div className="mt-8 text-center">
              <Button
                asChild
                variant="ghost"
                className="text-livotale-teal hover:bg-white/10 hover:text-white"
              >
                <Link to="/packages">
                  Compare all packages
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
