import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePackagesAdminStore } from '@/store/packages';
import type { LiverCarePackage } from '@/types/package';
import type { TableColumn } from '@/types/common';

const LIST_PATH = '/admin/packages';

function formatPrice(pkg: LiverCarePackage): string {
  return `₹${(pkg.discountPrice ?? pkg.price).toLocaleString('en-IN')}`;
}

export function AdminPackagesPage() {
  const navigate = useNavigate();
  const packages = usePackagesAdminStore((s) => s.packages);
  const searchInput = usePackagesAdminStore((s) => s.searchInput);
  const isLoading = usePackagesAdminStore((s) => s.isLoading);
  const error = usePackagesAdminStore((s) => s.error);
  const fetchPackages = usePackagesAdminStore((s) => s.fetchPackages);
  const setSearchInput = usePackagesAdminStore((s) => s.setSearchInput);

  useEffect(() => {
    void fetchPackages();
  }, [fetchPackages]);

  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.subtitle?.toLowerCase().includes(q) ?? false),
    );
  }, [packages, searchInput]);

  const columns: TableColumn<LiverCarePackage>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (p) => <span className="font-medium">{p.code}</span>,
    },
    {
      key: 'name',
      header: 'Package',
      render: (p) => (
        <div>
          <p className="font-medium">{p.name}</p>
          {p.subtitle && <p className="text-xs text-muted-foreground">{p.subtitle}</p>}
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (p) => formatPrice(p),
    },
    {
      key: 'workflow',
      header: 'Workflow',
      render: (p) => (
        <span className="text-xs text-muted-foreground">
          Scan {p.fibrosisScanIncluded ? '✓' : '—'} · Path {p.pathologyIncluded ? '✓' : '—'} · Consult {p.consultationIncluded ? '✓' : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <div className="flex flex-wrap gap-1">
          {p.active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}
          {p.visibilityWeb && <Badge variant="secondary">Web</Badge>}
          {p.recommendedTag && <Badge variant="secondary">★</Badge>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Liver care packages"
        description="List of all packages. Click a row to view or edit. Public site: /packages."
        actions={<Button onClick={() => navigate(`${LIST_PATH}/new?tab=edit`)}>Add package</Button>}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by code or name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
          aria-label="Search packages"
        />
        <p className="text-sm text-muted-foreground">{filtered.length} package{filtered.length === 1 ? '' : 's'}</p>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyMessage="No packages yet. Add your first package."
        getRowKey={(p) => p.id}
        onRowClick={(p) => navigate(`${LIST_PATH}/${p.id}?tab=view`)}
      />
    </div>
  );
}
