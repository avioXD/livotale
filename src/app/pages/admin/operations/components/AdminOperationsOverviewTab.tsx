import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OperationsOverview } from '@/types/adminOperations';

interface AdminOperationsOverviewTabProps {
  overview: OperationsOverview | null;
  onNavigateTab: (tab: string, query?: Record<string, string>) => void;
}

function KpiCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
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
        <Button size="sm" variant="outline" onClick={() => onNavigateTab('samples', { status: 'pending_technician_assignment' })}>
          Samples to assign
        </Button>
        <Button size="sm" variant="outline" onClick={() => onNavigateTab('orders', { paymentStatus: 'pending' })}>
          Collect payments
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Today's appointments"
          value={overview.appointmentsToday}
          hint="All types — consult, tele, home sample"
        />
        <KpiCard
          label="Pending assignments"
          value={overview.pendingAssignments}
          hint="No doctor or technician assigned"
        />
        <KpiCard
          label="Missed / no-show today"
          value={overview.missedToday}
          hint="Filter in Appointments tab"
        />
        <KpiCard
          label="Samples awaiting assign"
          value={overview.samplesPendingAssign}
          hint="Home collection requests"
        />
        <KpiCard
          label="Unpaid orders"
          value={overview.unpaidOrders}
          hint="Appointments + pharmacy"
        />
        <KpiCard
          label="Collected today"
          value={`₹${overview.collectedToday.toLocaleString('en-IN')}`}
          hint="Cash, QR & online"
        />
      </div>
    </div>
  );
}
