import { Link } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';
import { WHATSAPP_MESSAGES } from '@/app/config/whatsappMessages';
import { PackageTestPanel } from '@/components/packages/PackageTestPanel';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { bulletsFromSections } from '@/services/liverCare/package.utils';
import type { LiverCarePackage } from '@/types/package';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function formatPrice(pkg: LiverCarePackage): string {
  const price = pkg.discountPrice ?? pkg.price;
  return `₹${price.toLocaleString('en-IN')}`;
}

interface PublicPackageCardProps {
  pkg: LiverCarePackage;
  featured?: boolean;
}

export function PublicPackageCard({ pkg, featured = false }: PublicPackageCardProps) {
  const isFeatured = featured || pkg.recommendedTag;
  const bullets = pkg.includes.bullets.length
    ? pkg.includes.bullets
    : bulletsFromSections(pkg.checklistSections);

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
        isFeatured
          ? 'border-livotale-pink ring-2 ring-livotale-pink/20 lg:scale-[1.02]'
          : 'border-slate-200 hover:border-livotale-teal/40',
      )}
    >
      <div
        className={cn(
          'h-1.5 w-full',
          isFeatured
            ? 'bg-gradient-to-r from-livotale-pink to-livotale-teal'
            : 'bg-gradient-to-r from-livotale-teal/60 to-livotale-teal',
        )}
      />

      {isFeatured && (
        <div className="absolute right-4 top-5 z-10">
          <Badge className="gap-1 border-0 bg-livotale-pink text-white shadow-md hover:bg-livotale-pink">
            <Sparkles className="h-3 w-3" aria-hidden />
            Most Popular
          </Badge>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-livotale-teal">
          {pkg.code}
        </div>
        <h3 className="pr-24 text-xl font-bold leading-tight text-slate-900">{pkg.name}</h3>
        <p className="mt-2 text-sm text-slate-600">{pkg.subtitle ?? pkg.description}</p>

        <div className="mt-5 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-livotale-pink">{formatPrice(pkg)}</span>
          {pkg.discountPrice && (
            <span className="text-sm text-slate-400 line-through">
              ₹{pkg.price.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {pkg.testCountTotal && (
          <div className="mt-3 inline-flex w-fit items-center rounded-full bg-livotale-teal/10 px-3 py-1 text-xs font-semibold text-livotale-teal">
            {pkg.testCountTotal} pathology tests included
          </div>
        )}

        {pkg.highlights.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {pkg.highlights.slice(0, 3).map((h) => (
              <span
                key={`${h.label}-${h.value}`}
                className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
              >
                {h.label}: <span className="font-medium text-slate-800">{h.value}</span>
              </span>
            ))}
          </div>
        )}

        {pkg.testCategories && pkg.testCategories.length > 0 && (
          <div className="mt-4">
            <PackageTestPanel
              categories={pkg.testCategories}
              totalCount={pkg.testCountTotal}
              compact
              className="border-livotale-teal/20 bg-gradient-to-br from-amber-50 to-livotale-teal/5"
            />
          </div>
        )}

        <ul className="mt-4 flex-1 space-y-2">
          {bullets.slice(0, 4).map((b) => (
            <li key={b} className="flex gap-2 text-sm text-slate-600">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-livotale-teal" aria-hidden />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2">
          <WhatsAppButton
            className="w-full shadow-md"
            label="Book on WhatsApp"
            message={WHATSAPP_MESSAGES.packageCard(pkg.name, pkg.code)}
          />
          <Button
            asChild
            variant="outline"
            className="w-full border-livotale-pink/30 text-livotale-pink hover:bg-livotale-pink/5"
          >
            <Link to={`/packages/${pkg.code}`}>View full details</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
