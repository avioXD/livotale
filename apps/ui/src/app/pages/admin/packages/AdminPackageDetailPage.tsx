import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { EntityDetailShell } from '@/components/common/EntityDetailShell';
import { PackageDetailView } from '@/components/packages/PackageDetailView';
import { PackageFormPanel } from '@/app/pages/admin/packages/PackageFormPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePackageDetailStore } from '@/store/packages';
import type { LiverCarePackage } from '@/types/package';
import { orgPath } from '@/app/config/orgRoutes';

const LIST_PATH = orgPath('/admin/packages');

export function AdminPackageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isCreate = id === 'new';

  const pkg = usePackageDetailStore((s) => s.pkg);
  const draft = usePackageDetailStore((s) => s.draft);
  const isLoading = usePackageDetailStore((s) => s.isLoading);
  const isSaving = usePackageDetailStore((s) => s.isSaving);
  const error = usePackageDetailStore((s) => s.error);
  const initCreate = usePackageDetailStore((s) => s.initCreate);
  const loadById = usePackageDetailStore((s) => s.loadById);
  const patchDraft = usePackageDetailStore((s) => s.patchDraft);
  const save = usePackageDetailStore((s) => s.save);
  const remove = usePackageDetailStore((s) => s.remove);
  const clear = usePackageDetailStore((s) => s.clear);

  useEffect(() => {
    if (!id) return;
    if (isCreate) {
      void initCreate();
    } else {
      void loadById(id);
    }
    return () => clear();
  }, [id, isCreate, initCreate, loadById, clear]);

  const handleSave = async () => {
    try {
      const saved = await save();
      navigate(`${LIST_PATH}/${saved.id}?tab=view`, { replace: true });
    } catch {
      // error set in store
    }
  };

  const handleDelete = async () => {
    if (!pkg || !globalThis.confirm(`Delete ${pkg.code}? This cannot be undone if orders reference it.`)) return;
    try {
      await remove();
      navigate(LIST_PATH);
    } catch {
      // error set in store
    }
  };

  if (!id) return <Navigate to={LIST_PATH} replace />;

  if (isLoading) {
    return <p className="text-muted-foreground">Loading package…</p>;
  }

  if (!isCreate && !pkg) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Package not found.</p>
        <Button variant="outline" asChild>
          <Link to={LIST_PATH}>Back to packages</Link>
        </Button>
      </div>
    );
  }

  const viewPkg: LiverCarePackage = pkg ?? {
    ...draft!,
    id: 'preview',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <EntityDetailShell
      backTo={LIST_PATH}
      backLabel="Back to packages"
      title={isCreate ? 'New package' : `${pkg!.code} — ${pkg!.name}`}
      description={isCreate ? 'Create a new liver care package' : pkg!.subtitle ?? pkg!.description}
      createMode={isCreate}
      actions={
        !isCreate && pkg ? (
          <div className="flex flex-wrap gap-2">
            {pkg.visibilityWeb && pkg.active && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/packages/${pkg.code}`} target="_blank" rel="noreferrer">Public preview</Link>
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={() => void handleDelete()}>Delete</Button>
          </div>
        ) : undefined
      }
      viewContent={
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {pkg?.active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}
            {pkg?.visibilityWeb && <Badge variant="secondary">On website</Badge>}
            {pkg?.recommendedTag && <Badge variant="secondary">Recommended</Badge>}
          </div>
          <PackageDetailView pkg={viewPkg} showEnquire={false} />
        </div>
      }
      editContent={
        <div className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {draft && (
            <PackageFormPanel
              draft={draft}
              onChange={patchDraft}
              onSave={() => void handleSave()}
              onCancel={() => navigate(isCreate ? LIST_PATH : `${LIST_PATH}/${id}?tab=view`)}
              saving={isSaving}
              isCreate={isCreate}
            />
          )}
        </div>
      }
    />
  );
}
