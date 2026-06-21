import { Link, useSearchParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type EntityDetailTab = 'view' | 'edit';

interface EntityDetailShellProps {
  backTo: string;
  backLabel?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Hide view tab (e.g. create flow — edit only until first save) */
  createMode?: boolean;
  defaultTab?: EntityDetailTab;
  /** URL query value for the edit tab (default `edit`). Enquiries use `followup`. */
  editTabKey?: string;
  /** Label for the edit tab when not in create mode (default `Edit`). */
  editTabLabel?: string;
  viewContent: React.ReactNode;
  editContent: React.ReactNode;
}

export function EntityDetailShell({
  backTo,
  backLabel = 'Back to list',
  title,
  description,
  actions,
  createMode = false,
  defaultTab = 'view',
  editTabKey = 'edit',
  editTabLabel = 'Edit',
  viewContent,
  editContent,
}: EntityDetailShellProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const isEditTab = tabParam === 'edit' || tabParam === editTabKey;
  const activeTab: EntityDetailTab = createMode ? 'edit' : isEditTab ? 'edit' : defaultTab;
  const editTabValue = createMode ? 'edit' : editTabKey;

  const setTab = (tab: EntityDetailTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab === 'edit' ? editTabValue : tab);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={backTo} aria-label={backLabel}>
            <FiArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <PageHeader title={title} description={description} actions={actions} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setTab(v as EntityDetailTab)}>
        <TabsList>
          {!createMode && <TabsTrigger value="view">View</TabsTrigger>}
          <TabsTrigger value="edit">{createMode ? 'Create' : editTabLabel}</TabsTrigger>
        </TabsList>

        {!createMode && (
          <TabsContent value="view" className="mt-4">
            {viewContent}
          </TabsContent>
        )}

        <TabsContent value="edit" className="mt-4">
          {editContent}
        </TabsContent>
      </Tabs>
    </div>
  );
}
