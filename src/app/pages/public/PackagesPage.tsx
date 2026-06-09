import { useEffect } from 'react';
import { PublicPackageCard } from '@/app/pages/public/components/PublicPackageCard';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { WHATSAPP_MESSAGES } from '@/app/config/whatsappMessages';
import { usePublicPackagesStore } from '@/store/packages';

export function PackagesPage() {
  const packages = usePublicPackagesStore((s) => s.packages);
  const isLoadingList = usePublicPackagesStore((s) => s.isLoadingList);
  const packagesError = usePublicPackagesStore((s) => s.error);
  const fetchPublicList = usePublicPackagesStore((s) => s.fetchPublicList);

  useEffect(() => {
    void fetchPublicList();
  }, [fetchPublicList]);

  if (isLoadingList) {
    return <p className="text-muted-foreground">Loading packages…</p>;
  }

  if (packagesError) {
    return <p className="text-destructive">{packagesError}</p>;
  }

  if (packages.length === 0) {
    return <p className="text-muted-foreground">No packages available right now.</p>;
  }

  const recommended = packages.find((p) => p.recommendedTag);

  return (
    <div className="space-y-10">
      <div className="rounded-2xl bg-gradient-to-r from-livotale-pink/10 to-livotale-teal/10 px-6 py-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-livotale-teal">Our packages</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Liver Fibrosis Scan Packages</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          Non-invasive liver assessment at home. Compare plans, see every test included, and book on WhatsApp.
        </p>
        <div className="mt-6 flex justify-center">
          <WhatsAppButton label="Get help choosing" message={WHATSAPP_MESSAGES.general} />
        </div>
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-3">
        {packages.map((pkg) => (
          <PublicPackageCard key={pkg.id} pkg={pkg} featured={pkg.id === recommended?.id} />
        ))}
      </div>
    </div>
  );
}
