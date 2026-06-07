import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { SampleAnalyticsPanel } from '@/app/pages/sample-collection/components/SampleAnalyticsPanel';
import { Button } from '@/components/ui/button';
import { opsAnalyticsService, type AnalyticsPeriod } from '@/services/opsAnalytics';
import type { SampleCollectionAnalytics } from '@/types/sampleCollection';

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export function LabDashboardPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('monthly');
  const [analytics, setAnalytics] = useState<SampleCollectionAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await opsAnalyticsService.getLabAnalytics(period);
        setAnalytics(data);
        setUsingDemo(false);
      } catch {
        setAnalytics(await opsAnalyticsService.getLabAnalytics(period));
        setUsingDemo(true);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [period]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab dashboard"
        description="Collected samples and published reports — daily, monthly, or yearly."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/lab-samples">Sample testing queue</Link>
          </Button>
        }
      />

      {usingDemo && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Showing demo analytics — connect API and run migration 027 + seed for live data.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant={period === p.value ? 'default' : 'outline'}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading analytics…</p>
      ) : analytics ? (
        <SampleAnalyticsPanel analytics={analytics} title="Your lab performance" />
      ) : null}
    </div>
  );
}
