import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardErrorState } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PatientDashboardPanel } from '@/app/pages/patients/components/PatientDashboardPanel';
import { PatientOrderCard } from '@/app/pages/patient-portal/components/PatientOrderCard';
import { patientPortalService } from '@/services/liverCare';
import { getMostUrgentPatientAction } from '@/services/liverCare/patientOrderProgress';
import { usePatientPortalStore } from '@/store';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { PatientDownloadItem, PatientNotification } from '@/types/patientPortal';
import type { PatientDashboardData } from '@/types/patients';

export function PatientDashboardPage() {
  const session = usePatientPortalStore((s) => s.session)!;
  const [orders, setOrders] = useState<LiverCareOrder[]>([]);
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [downloads, setDownloads] = useState<PatientDownloadItem[]>([]);
  const [healthDashboard, setHealthDashboard] = useState<PatientDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    void Promise.all([
      patientPortalService.listMyOrders(session.phone),
      patientPortalService.listNotifications(session.phone),
      patientPortalService.listDownloads(session.phone),
      patientPortalService.getDashboardAnalytics(session.phone).catch(() => null),
    ])
      .then(([orderRows, notifRows, dlRows, analytics]) => {
        setOrders(orderRows);
        setNotifications(notifRows);
        setDownloads(dlRows);
        setHealthDashboard(analytics);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load your dashboard');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, [session.phone]);

  const unread = notifications.filter((n) => !n.read).length;
  const reports = downloads.filter((d) => d.type === 'report');
  const prescriptions = downloads.filter((d) => d.type === 'prescription');
  const nextAction = getMostUrgentPatientAction(orders);
  const recentOrders = orders.slice(0, 2);

  if (loading) {
    return <p className="text-muted-foreground">Loading your orders…</p>;
  }

  if (error) {
    return <DashboardErrorState message={error} onRetry={load} title="Could not load your dashboard" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {session.patientName}</h1>
        <p className="text-muted-foreground">Track orders, payments, reports, and prescriptions.</p>
      </div>

      {nextAction.type !== 'none' ? (
        <Card className="border-livotale-pink/30 bg-gradient-to-br from-livotale-pink/5 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Next step</CardTitle>
            <p className="text-sm text-muted-foreground">{nextAction.order.orderNumber} · {nextAction.order.packageName}</p>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={nextAction.href}>{nextAction.label}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : orders.length > 0 ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4 text-sm text-green-900">
            You&apos;re all caught up. We&apos;ll notify you when there&apos;s something new.
          </CardContent>
        </Card>
      ) : null}

      {unread > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm">
              You have <span className="font-semibold">{unread}</span> unread notification{unread === 1 ? '' : 's'}.
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link to="/patient/notifications">View inbox</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {healthDashboard && <PatientDashboardPanel dashboard={healthDashboard} />}

      {(reports.length > 0 || prescriptions.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {reports.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-green-900">Published reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {reports.slice(0, 3).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{r.label}</span>
                    <Button size="sm" asChild>
                      <Link to={`/patient/orders/${r.orderId}/report`}>View</Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {prescriptions.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-green-900">Published prescriptions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {prescriptions.slice(0, 3).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{r.label}</span>
                    <Button size="sm" asChild>
                      <Link to={`/patient/orders/${r.orderId}/prescription`}>View</Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Recent orders</h2>
          {orders.length > 2 && (
            <Button variant="link" className="h-auto p-0" asChild>
              <Link to="/patient/orders">View all ({orders.length})</Link>
            </Button>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No orders yet.{' '}
              <Link to="/packages" className="text-livotale-pink hover:underline">
                View packages
              </Link>
            </CardContent>
          </Card>
        ) : (
          recentOrders.map((order) => <PatientOrderCard key={order.id} order={order} />)
        )}
      </div>
    </div>
  );
}
