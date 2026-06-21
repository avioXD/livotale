import { Link } from 'react-router-dom';
import { LogIn, Stethoscope, User } from 'lucide-react';
import { LandingSectionHeading } from '@/app/pages/public/components/LandingSectionHeading';
import { ORG_LOGIN_PATH } from '@/app/config/orgRoutes';
import { Button } from '@/components/ui/button';

export function LandingLoginSection() {
  return (
    <section id="login" className="scroll-mt-20 bg-black py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <LandingSectionHeading
          variant="centered"
          accent="teal"
          align="center"
          eyebrow="Your account"
          title="Access your LivoTale portal"
          description="View scan reports, track your liver health journey, or manage operations from your dashboard."
        />

        <div className="mx-auto mt-10 grid max-w-3xl gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-livotale-teal/10 text-livotale-teal">
              <User className="h-6 w-6" aria-hidden />
            </div>
            <h3 className="mt-5 text-xl font-bold text-white">Patient / Client Login</h3>
            <p className="mt-2 text-base leading-relaxed text-neutral-400">
              View your FibroScan reports, health dashboard, and appointment history.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 w-full bg-livotale-teal text-white hover:bg-livotale-teal/90"
            >
              <Link to="/patient/login">
                <LogIn className="mr-2 h-4 w-4" />
                Patient Login
              </Link>
            </Button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-livotale-pink/10 text-livotale-pink">
              <Stethoscope className="h-6 w-6" aria-hidden />
            </div>
            <h3 className="mt-5 text-xl font-bold text-white">Staff Login</h3>
            <p className="mt-2 text-base leading-relaxed text-neutral-400">
              For doctors, technicians, and operations staff to manage scans and patients.
            </p>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="mt-6 w-full border-livotale-pink/40 text-livotale-pink hover:bg-livotale-pink/10"
            >
              <Link to={ORG_LOGIN_PATH}>
                <LogIn className="mr-2 h-4 w-4" />
                Staff Login
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
