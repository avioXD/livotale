import { Link, useLocation, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppRole } from '@/types';

export function getAdminIntegrationsPath(city?: string, suffix = '') {
  return `/org/${city || 'kolkata'}/admin/integrations${suffix}`;
}

export function useAdminIntegrationsRole() {
  const { city } = useParams();
  return { city, basePath: getAdminIntegrationsPath(city) };
}

function IntegrationsBackNav({ city }: { city?: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link to={getAdminIntegrationsPath(city)}>
        <FiArrowLeft className="mr-2 h-4 w-4" />
        Back to integrations
      </Link>
    </Button>
  );
}

export function AdminIntegrationsPageShell({
  role: _role,
  title,
  description,
  children,
  badge,
}: {
  role: AppRole | null;
  title: string;
  description?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const { city } = useParams();
  const isHub = pathname === getAdminIntegrationsPath(city);

  return (
    <div className="space-y-6">
      {!isHub ? <IntegrationsBackNav city={city} /> : null}
      <PageHeader
        title={title}
        description={description}
        actions={badge ? <Badge variant="secondary">{badge}</Badge> : undefined}
      />
      {children}
    </div>
  );
}

export function IntegrationHubCard({
  title,
  description,
  href,
  badge,
  configured,
}: {
  title: string;
  description: string;
  href: string;
  badge?: string;
  configured?: boolean;
}) {
  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {configured !== undefined ? (
              <Badge variant={configured ? 'default' : 'secondary'}>
                {configured ? 'Configured' : 'Not configured'}
              </Badge>
            ) : null}
            {badge ? <Badge variant="outline">{badge}</Badge> : null}
          </div>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link to={href}>Open</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function SuperAdminOnlyNotice() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Restricted section</CardTitle>
        <CardDescription>Only Super Admin can view and update provider credentials on this page.</CardDescription>
      </CardHeader>
    </Card>
  );
}
