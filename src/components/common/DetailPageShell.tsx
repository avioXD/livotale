import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';

interface DetailPageShellProps {
  backTo: string;
  backLabel?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/** Standard detail header: [←] back arrow left, then title + optional header actions. */
export function DetailPageShell({
  backTo,
  backLabel = 'Back to list',
  title,
  description,
  actions,
  children,
}: DetailPageShellProps) {
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
      {children}
    </div>
  );
}
