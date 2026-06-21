import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PackageDetailView } from '@/components/packages/PackageDetailView';
import { usePublicPackagesStore } from '@/store/packages';
import { Button } from '@/components/ui/button';

export function PackageDetailPage() {
  const { code } = useParams<{ code: string }>();
  const [notFound, setNotFound] = useState(false);

  const selected = usePublicPackagesStore((s) => s.selected);
  const isLoadingDetail = usePublicPackagesStore((s) => s.isLoadingDetail);
  const fetchByCode = usePublicPackagesStore((s) => s.fetchByCode);
  const clearSelected = usePublicPackagesStore((s) => s.clearSelected);

  useEffect(() => {
    if (!code) {
      setNotFound(true);
      return;
    }
    setNotFound(false);
    void fetchByCode(code).then((row) => {
      if (!row) setNotFound(true);
    });
    return () => clearSelected();
  }, [code, fetchByCode, clearSelected]);

  if (isLoadingDetail && !selected) {
    return <p className="text-muted-foreground">Loading package…</p>;
  }

  if (notFound || !selected) {
    return (
      <div className="space-y-4 text-center py-12">
        <h1 className="text-xl font-semibold">Package not found</h1>
        <p className="text-muted-foreground">This package may be unavailable or the link is incorrect.</p>
        <Button asChild variant="outline">
          <Link to="/packages">View all packages</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/packages">← All packages</Link>
      </Button>
      <PackageDetailView pkg={selected} readOnly showEnquire />
    </div>
  );
}
