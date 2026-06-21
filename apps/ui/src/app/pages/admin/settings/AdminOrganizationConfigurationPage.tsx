import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FiMapPin, FiSettings } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

function orgConfigPath(city?: string, suffix = '') {
  return `/org/${city || 'kolkata'}/admin/organization-configuration${suffix}`;
}

export function AdminOrganizationConfigurationPage() {
  const { city } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeTab = pathname.includes('/service-zones') ? 'service-zones' : 'integrations';

  const handleTabChange = (value: string) => {
    navigate(orgConfigPath(city, value === 'service-zones' ? '/service-zones' : '/integrations'));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization"
        description="Manage organization-level integrations and service coverage."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-5">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="integrations" className="gap-2">
            <FiSettings className="h-4 w-4" />
            Integration
          </TabsTrigger>
          <TabsTrigger value="service-zones" className="gap-2">
            <FiMapPin className="h-4 w-4" />
            Service Zone
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Outlet />
    </div>
  );
}
