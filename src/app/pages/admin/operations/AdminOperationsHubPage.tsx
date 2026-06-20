import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { useAsyncData } from '@/hooks/useAsyncData';
import { OPERATIONS_TABS } from '@/app/pages/admin/operations/adminOperationsConfig';
import { AdminOperationsOverviewTab } from '@/app/pages/admin/operations/components/AdminOperationsOverviewTab';
import { AdminOperationsAppointmentsTab } from '@/app/pages/admin/operations/components/AdminOperationsAppointmentsTab';
import { AdminOperationsPartnerLabTab } from '@/app/pages/admin/operations/components/AdminOperationsPartnerLabTab';
import { AdminOperationsOrdersTab } from '@/app/pages/admin/operations/components/AdminOperationsOrdersTab';
import { AdminOperationsEnquiriesTab } from '@/app/pages/admin/operations/components/AdminOperationsEnquiriesTab';
import { AdminOperationsAIReviewTab } from '@/app/pages/admin/operations/components/AdminOperationsAIReviewTab';
import { adminOperationsService } from '@/services/admin/AdminOperationsService';
import type { OperationsTab } from '@/types/adminOperations';

function parseTab(value: string | null): OperationsTab {
  if (value === 'samples') return 'partner-lab';
  if (
    value === 'enquiries' ||
    value === 'appointments' ||
    value === 'partner-lab' ||
    value === 'orders' ||
    value === 'ai-review'
  ) {
    return value;
  }
  return 'overview';
}

export function AdminOperationsHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));

  const overviewQuery = useAsyncData(
    () => adminOperationsService.getOverview(),
    [],
  );

  const setTab = useCallback(
    (next: OperationsTab, extra?: Record<string, string>) => {
      const params = new URLSearchParams();
      if (next !== 'overview') {
        params.set('tab', next);
      }
      if (extra) {
        for (const [key, value] of Object.entries(extra)) {
          if (value) params.set(key, value);
        }
      }
      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  const tabMeta = OPERATIONS_TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-6">
      <PageHeader
        title={tabMeta.label}
        description={tabMeta.description}
      />

      {tab === 'overview' && (
        <AdminOperationsOverviewTab
          overview={overviewQuery.data}
          overviewLoading={overviewQuery.status === 'loading'}
          overviewError={overviewQuery.status === 'error' ? overviewQuery.error : null}
          onRetryOverview={overviewQuery.retry}
          onNavigateTab={setTab}
        />
      )}
      {tab === 'enquiries' && <AdminOperationsEnquiriesTab />}
      {tab === 'appointments' && <AdminOperationsAppointmentsTab />}
      {tab === 'partner-lab' && <AdminOperationsPartnerLabTab />}
      {tab === 'orders' && <AdminOperationsOrdersTab />}
      {tab === 'ai-review' && <AdminOperationsAIReviewTab />}
    </div>
  );
}
