import { PageHeader } from '@/components/common/PageHeader';

interface ListPageShellProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  error?: string | null;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Standard list page: PageHeader (title + primary action right) → toolbar (search/filters) → table → pagination footer.
 */
export function ListPageShell({
  title,
  description,
  actions,
  error,
  toolbar,
  children,
  footer,
}: ListPageShellProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} actions={actions} />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {toolbar}

      {children}

      {footer}
    </div>
  );
}
