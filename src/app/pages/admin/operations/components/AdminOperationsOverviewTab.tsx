import { Link } from 'react-router-dom';
import { KpiCard, KpiGrid, kpiAccentAt } from '@/components/common';
import { Button } from '@/components/ui/button';
import type { OperationsOverview } from '@/types/adminOperations';

interface AdminOperationsOverviewTabProps {
  overview: OperationsOverview | null;
  onNavigateTab: (tab: string, query?: Record<string, string>) => void;
}

export function AdminOperationsOverviewTab({ overview, onNavigateTab }: AdminOperationsOverviewTabProps) {
  if (!overview) {
    return <p className="text-sm text-muted-foreground">Loading overview…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" asChild>
          <Link to="/admin/appointments/book">Book walk-in</Link>
        </Button>
        <Button size="sm" variant="outline" onClick={() => onNavigateTab('appointments', { status: 'pending_payment' })}>
          Pending payments
        </Button>
        <Button size="sm" variant="outline" onClick={() => onNavigateTab('appointments', { status: 'missed' })}>
          Missed today
        </Button>
        <Button size="sm" variant="outline" onClick={() => onNavigateTab('partner-lab', { status: 'pending_dispatch' })}>
          Lab partner queue
        </Button>
        <Button size="sm" variant="outline" onClick={() => onNavigateTab('enquiries')}>
          Enquiry queue
        </Button>
        <Button size="sm" variant="outline" onClick={() => onNavigateTab('orders', { paymentStatus: 'pending' })}>
          Collect payments
        </Button>
      </div>

      <KpiGrid cols="three">
        {[
          {
            label: "Today's appointments",
            value: overview.appointmentsToday,
            hint: 'All types — consult, tele, home sample',
          },
          {
            label: 'Pending assignments',
            value: overview.pendingAssignments,
            hint: 'No doctor or technician assigned',
          },
          {
            label: 'Missed / no-show today',
            value: overview.missedToday,
            hint: 'Filter in Appointments tab',
          },
          {
            label: 'Samples awaiting assign',
            value: overview.samplesPendingAssign,
            hint: 'Home collection — see Lab reports tab for dispatch',
          },
          {
            label: 'Unpaid orders',
            value: overview.unpaidOrders,
            hint: 'Appointments + pharmacy',
          },
          {
            label: 'Collected today',
            value: `₹${overview.collectedToday.toLocaleString('en-IN')}`,
            hint: 'Cash, QR & online',
          },
        ].map((kpi, i) => (
          <KpiCard key={kpi.label} {...kpi} accent={kpiAccentAt(i)} />
        ))}
      </KpiGrid>
    </div>
  );
}
