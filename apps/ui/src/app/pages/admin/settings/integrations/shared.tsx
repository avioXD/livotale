import { Link, useLocation, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppRole } from '@/types';
import type { IntegrationConfigSource } from '@/services/admin/IntegrationsAdminService';

export function sourceBadgeLabel(source?: IntegrationConfigSource) {
  return source === 'env' ? 'Env' : 'UI';
}

export function ManagedByEnvNotice({ provider }: { provider: string }) {
  return (
    <div className="rounded-md border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
      {provider} credentials are managed by environment variables. Credential fields are read-only until the source is changed to UI/database.
    </div>
  );
}

export function ConfigSourceSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value?: IntegrationConfigSource;
  onChange: (value: IntegrationConfigSource) => void;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      value={value ?? 'database'}
      onChange={(e) => onChange(e.target.value as IntegrationConfigSource)}
      disabled={disabled}
    >
      <option value="database">UI/database</option>
      <option value="env">Environment</option>
    </select>
  );
}

export function MissingFieldsNotice({ fields }: { fields?: string[] }) {
  if (!fields?.length) return null;
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
      Missing: {fields.join(', ')}
    </div>
  );
}

export function getAdminIntegrationsPath(city?: string, suffix = '') {
  return `/org/${city || 'kolkata'}/admin/organization-configuration/integrations${suffix}`;
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
  source,
}: {
  role: AppRole | null;
  title: string;
  description?: string;
  badge?: string;
  source?: IntegrationConfigSource;
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
        actions={
          badge || source ? (
            <div className="flex flex-wrap gap-2">
              {badge ? <Badge variant="secondary">{badge}</Badge> : null}
              {source ? <Badge variant="outline">{sourceBadgeLabel(source)}</Badge> : null}
            </div>
          ) : undefined
        }
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
  source,
  disabled,
}: {
  title: string;
  description: string;
  href: string;
  badge?: string;
  configured?: boolean;
  source?: IntegrationConfigSource;
  disabled?: boolean;
}) {
  return (
    <Card className={disabled ? 'opacity-70' : 'transition-colors hover:border-primary/40'}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {configured !== undefined ? (
              <Badge variant={configured ? 'default' : 'secondary'}>
                {configured ? 'Configured' : 'Not configured'}
              </Badge>
            ) : null}
            {source ? <Badge variant="outline">{sourceBadgeLabel(source)}</Badge> : null}
            {badge ? <Badge variant="outline">{badge}</Badge> : null}
            {disabled ? <Badge variant="secondary">Coming soon</Badge> : null}
          </div>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" disabled={disabled}>
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
