import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { WHATSAPP_MESSAGES } from '@/app/config/whatsappMessages';
import { PackageTestPanel } from '@/components/packages/PackageTestPanel';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import type { LiverCarePackage } from '@/types/package';
import { ALWAYS_INCLUDED_DELIVERY_ITEMS, bulletsFromSections, publicBulletsForPackage, publicPackageCopy } from '@/services/liverCare/package.utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

function formatPrice(pkg: LiverCarePackage): { display: string; strike?: string } {
  const effective = pkg.discountPrice ?? pkg.price;
  if (pkg.discountPrice) {
    return {
      display: `₹${pkg.discountPrice.toLocaleString('en-IN')}`,
      strike: `₹${pkg.price.toLocaleString('en-IN')}`,
    };
  }
  return { display: `₹${effective.toLocaleString('en-IN')}` };
}

interface PackageDetailViewProps {
  pkg: LiverCarePackage;
  /** Show enquire CTA (public). Omit for admin preview. */
  showEnquire?: boolean;
  /** Read-only public view — WhatsApp CTA instead of enquire form */
  readOnly?: boolean;
  /** Compact mode for admin side panel */
  compact?: boolean;
}

export function PackageDetailView({ pkg, showEnquire = true, readOnly = false, compact = false }: PackageDetailViewProps) {
  const price = formatPrice(pkg);
  const bullets = readOnly
    ? publicBulletsForPackage(pkg)
    : pkg.includes.bullets.length
      ? pkg.includes.bullets
      : bulletsFromSections(pkg.checklistSections);

  return (
    <div className={compact ? 'space-y-4' : 'space-y-8'}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{pkg.code}</Badge>
          {pkg.recommendedTag && <Badge>Recommended</Badge>}
          {!pkg.active && <Badge variant="secondary">Inactive</Badge>}
        </div>
        <div>
          <h1 className={compact ? 'text-xl font-bold' : 'text-3xl font-bold tracking-tight'}>{pkg.name}</h1>
          {pkg.subtitle && <p className="mt-1 text-muted-foreground">{pkg.subtitle}</p>}
          {pkg.tagline && <p className="mt-2 text-sm font-medium text-livotale-pink">{pkg.tagline}</p>}
        </div>
        <p className="text-muted-foreground">{pkg.description}</p>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className={compact ? 'text-2xl font-bold' : 'text-4xl font-bold'}>{price.display}</span>
          {price.strike && <span className="text-lg text-muted-foreground line-through">{price.strike}</span>}
        </div>
        {readOnly && (
          <WhatsAppButton
            size={compact ? 'default' : 'lg'}
            label="Enquire on WhatsApp"
            message={WHATSAPP_MESSAGES.packageDetail(pkg.name, pkg.code)}
          />
        )}
        {showEnquire && !readOnly && (
          <Button asChild size={compact ? 'default' : 'lg'}>
            <Link to={`/enquire?package=${pkg.code}`}>Book / Enquire</Link>
          </Button>
        )}
      </div>

      {pkg.testCategories && pkg.testCategories.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Tests included</h2>
          <PackageTestPanel
            categories={pkg.testCategories}
            totalCount={pkg.testCountTotal}
          />
        </div>
      )}

      {pkg.highlights.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pkg.highlights.map((h) => (
            <Card key={`${h.label}-${h.value}`} className="bg-muted/40">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{h.label}</p>
                <p className="mt-1 font-medium">{h.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className={compact ? 'space-y-4' : 'grid gap-8 lg:grid-cols-3'}>
        <div className={compact ? 'space-y-4' : 'lg:col-span-2 space-y-4'}>
          <h2 className="text-lg font-semibold">What&apos;s included</h2>
          {pkg.checklistSections.map((section) => (
            <Card key={section.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {section.items.map((item) => (
                  <div key={item.id} className="flex gap-3 text-sm">
                    <span className="mt-0.5 shrink-0">
                      {item.included ? (
                        <Check className="h-4 w-4 text-green-600" aria-hidden />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" aria-hidden />
                      )}
                    </span>
                    <div>
                      <p className={item.included ? '' : 'text-muted-foreground line-through'}>
                        {readOnly ? publicPackageCopy(item.label) : item.label}
                      </p>
                      {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          <Card className="bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Reports &amp; delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ALWAYS_INCLUDED_DELIVERY_ITEMS.map((label) => (
                <div key={label} className="flex gap-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
                  <p>{label}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {!compact && bullets.length > 0 && (
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Quick summary</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {bullets.map((b) => (
                    <li key={b}>• {b}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {pkg.preparation.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Preparation</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {pkg.preparation.map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {pkg.whoShouldBook.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Who should book</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {pkg.whoShouldBook.map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {pkg.faqs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Frequently asked questions</h2>
          <div className="space-y-2">
            {pkg.faqs.map((faq) => (
              <Card key={faq.question}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{faq.answer}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {pkg.termsConditions && (
        <>
          <Separator />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Terms & conditions</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pkg.termsConditions}</p>
          </div>
        </>
      )}
    </div>
  );
}
