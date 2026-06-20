import { Link } from 'react-router-dom';
import { DashboardErrorState, KpiCard, KpiGrid, kpiAccentAt } from '@/components/common';
import { Button } from '@/components/ui/button';
import type { OperationsOverview, OperationsTab } from '@/types/adminOperations';
import {
  OVERVIEW_KPI_DEFINITIONS,
  OVERVIEW_QUICK_ACTIONS,
} from '@/app/pages/admin/operations/overviewActions';

interface AdminOperationsOverviewTabProps {
  overview: OperationsOverview | null;
  overviewLoading: boolean;
  overviewError: string | null;
  onRetryOverview: () => void;
  onNavigateTab: (tab: OperationsTab, query?: Record<string, string>) => void;
}

export function AdminOperationsOverviewTab({
  overview,
  overviewLoading,
  overviewError,
  onRetryOverview,
  onNavigateTab,
}: AdminOperationsOverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {OVERVIEW_QUICK_ACTIONS.map((action) => {
          if (action.type === 'link' && action.path) {
            return (
              <Button key={action.label} size="sm" asChild variant={action.label === 'Book walk-in' ? 'default' : 'outline'}>
                <Link to={action.path}>{action.label}</Link>
              </Button>
            );
          }
          return (
            <Button
              key={action.label}
              size="sm"
              variant="outline"
              onClick={() => {
                if (action.tab) onNavigateTab(action.tab, action.params);
              }}
            >
              {action.label}
            </Button>
          );
        })}
      </div>

      {overviewError && (
        <DashboardErrorState
          title="Overview KPIs unavailable"
          message={overviewError}
          onRetry={onRetryOverview}
        />
      )}

      <KpiGrid cols="three">
        {OVERVIEW_KPI_DEFINITIONS.map((kpi, i) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={overview ? kpi.formatValue(overview) : '…'}
            hint={kpi.hint}
            href={kpi.href}
            accent={kpiAccentAt(i)}
            isLoading={overviewLoading && !overview}
          />
        ))}
      </KpiGrid>
    </div>
  );
}
