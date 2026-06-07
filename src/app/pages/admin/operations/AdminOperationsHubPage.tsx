import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { OPERATIONS_TABS } from '@/app/pages/admin/operations/adminOperationsConfig';
import { AdminOperationsOverviewTab } from '@/app/pages/admin/operations/components/AdminOperationsOverviewTab';
import { AdminOperationsAppointmentsTab } from '@/app/pages/admin/operations/components/AdminOperationsAppointmentsTab';
import { AdminOperationsSamplesTab } from '@/app/pages/admin/operations/components/AdminOperationsSamplesTab';
import { AdminOperationsOrdersTab } from '@/app/pages/admin/operations/components/AdminOperationsOrdersTab';
import { adminOperationsService } from '@/services/admin/AdminOperationsService';
import { useAdminAppointmentsStore } from '@/store';
import type { OperationsOverview, OperationsTab } from '@/types/adminOperations';

function parseTab(value: string | null): OperationsTab {
  if (value === 'appointments' || value === 'samples' || value === 'orders') return value;
  return 'overview';
}

export function AdminOperationsHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));
  const [overview, setOverview] = useState<OperationsOverview | null>(null);
  const loadDashboard = useAdminAppointmentsStore((s) => s.loadDashboard);

  const setTab = useCallback(
    (next: OperationsTab, extra?: Record<string, string>) => {
      const params = new URLSearchParams(searchParams);
      if (next === 'overview') {
        params.delete('tab');
      } else {
        params.set('tab', next);
      }
      if (extra) {
        for (const [k, v] of Object.entries(extra)) {
          if (v) params.set(k, v);
          else params.delete(k);
        }
      }
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    void loadDashboard();
    void adminOperationsService.getOverview().then(setOverview);
  }, [loadDashboard]);

  const tabMeta = OPERATIONS_TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-6">
      <PageHeader
        title={tabMeta.label}
        description={tabMeta.description}
      />

      {tab === 'overview' && (
        <AdminOperationsOverviewTab overview={overview} onNavigateTab={(t, q) => setTab(t as OperationsTab, q)} />
      )}
      {tab === 'appointments' && <AdminOperationsAppointmentsTab />}
      {tab === 'samples' && <AdminOperationsSamplesTab />}
      {tab === 'orders' && <AdminOperationsOrdersTab />}
    </div>
  );
}
