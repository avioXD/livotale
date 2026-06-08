import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bulletsFromSections } from '@/services/liverCare/package.utils';
import { usePublicPackagesStore } from '@/store/packages';
import type { LiverCarePackage } from '@/types/package';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

function formatPrice(pkg: LiverCarePackage): string {
  const price = pkg.discountPrice ?? pkg.price;
  return `₹${price.toLocaleString('en-IN')}`;
}

export function PackagesPage() {
  const packages = usePublicPackagesStore((s) => s.packages);
  const isLoadingList = usePublicPackagesStore((s) => s.isLoadingList);
  const fetchPublicList = usePublicPackagesStore((s) => s.fetchPublicList);

  useEffect(() => {
    void fetchPublicList();
  }, [fetchPublicList]);

  if (isLoadingList) {
    return <p className="text-muted-foreground">Loading packages…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Liver Fibrosis Scan Packages</h1>
        <p className="mt-2 text-muted-foreground">
          Non-invasive liver assessment at home. Choose the package that fits your needs.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {packages.map((pkg) => (
          <Card key={pkg.id} className={pkg.recommendedTag ? 'border-livotale-pink shadow-md' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                {pkg.recommendedTag && <Badge>Recommended</Badge>}
              </div>
              <CardDescription>{pkg.subtitle ?? pkg.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-2xl font-bold">{formatPrice(pkg)}</span>
                {pkg.discountPrice && (
                  <span className="ml-2 text-sm text-muted-foreground line-through">
                    ₹{pkg.price.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              {pkg.highlights.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pkg.highlights.slice(0, 3).map((h) => (
                    <Badge key={`${h.label}-${h.value}`} variant="secondary" className="font-normal">
                      {h.label}: {h.value}
                    </Badge>
                  ))}
                </div>
              )}
              <ul className="space-y-1 text-sm text-muted-foreground">
                {(pkg.includes.bullets.length ? pkg.includes.bullets : bulletsFromSections(pkg.checklistSections))
                  .slice(0, 5)
                  .map((b) => (
                    <li key={b}>• {b}</li>
                  ))}
              </ul>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button asChild variant="outline" className="w-full">
                <Link to={`/packages/${pkg.code}`}>View details</Link>
              </Button>
              <Button asChild className="w-full">
                <Link to={`/enquire?package=${pkg.code}`}>Enquire now</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
