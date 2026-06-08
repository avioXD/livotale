import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBell, FiDownload, FiFileText, FiUser } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { patientPortalService } from '@/services/liverCare';
import { usePatientPortalStore } from '@/store';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import type { PatientDownloadItem, PatientNotification } from '@/types/patientPortal';

export function PatientDashboardPage() {
  const session = usePatientPortalStore((s) => s.session)!;
  const [orders, setOrders] = useState<LiverCareOrder[]>([]);
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [downloads, setDownloads] = useState<PatientDownloadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      patientPortalService.listMyOrders(session.phone),
      patientPortalService.listNotifications(session.phone),
      patientPortalService.listDownloads(session.phone),
    ]).then(([orderRows, notifRows, dlRows]) => {
      setOrders(orderRows);
      setNotifications(notifRows);
      setDownloads(dlRows);
      setLoading(false);
    });
  }, [session.phone]);

  const unread = notifications.filter((n) => !n.read).length;
  const reports = downloads.filter((d) => d.type === 'report');
  const prescriptions = downloads.filter((d) => d.type === 'prescription');

  if (loading) {
    return <p className="text-muted-foreground">Loading your orders…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {session.patientName}</h1>
        <p className="text-muted-foreground">Track orders, payments, reports, and prescriptions.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <FiUser className="h-5 w-5 text-livotale-pink" />
            <div>
              <p className="text-sm font-medium">Profile</p>
              <Link to="/patient/profile" className="text-xs text-primary underline">Edit details</Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <FiBell className="h-5 w-5 text-livotale-pink" />
            <div>
              <p className="text-sm font-medium">Notifications {unread > 0 && `(${unread})`}</p>
              <Link to="/patient/notifications" className="text-xs text-primary underline">View inbox</Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <FiDownload className="h-5 w-5 text-livotale-pink" />
            <div>
              <p className="text-sm font-medium">Downloads ({downloads.length})</p>
              <Link to="/patient/downloads" className="text-xs text-primary underline">Download center</Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <FiFileText className="h-5 w-5 text-livotale-pink" />
            <div>
              <p className="text-sm font-medium">Support</p>
              <a href="mailto:care@livotale.test" className="text-xs text-primary underline">care@livotale.test</a>
            </div>
          </CardContent>
        </Card>
      </div>

      {(reports.length > 0 || prescriptions.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {reports.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-green-900">Published reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {reports.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span>{r.label}</span>
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
                {prescriptions.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span>{r.label}</span>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {orders.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{order.orderNumber}</p>
                <p className="text-sm text-muted-foreground">{order.packageName}</p>
                <p className="text-sm">₹{order.finalAmount.toLocaleString('en-IN')}</p>
                {order.consultationScheduledAt && (
                  <p className="text-xs text-muted-foreground">
                    Consultation: {new Date(order.consultationScheduledAt).toLocaleString()}
                  </p>
                )}
                {order.scanScheduledAt && (
                  <p className="text-xs text-muted-foreground">
                    Scan: {new Date(order.scanScheduledAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={order.paymentStatus === 'success' ? 'default' : 'outline'} className="capitalize">
                  {order.paymentStatus}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {ORDER_STATUS_LABELS[order.orderStatus]}
                </span>
                {order.paymentStatus !== 'success' && (
                  <Button size="sm" asChild>
                    <Link to={`/patient/orders/${order.id}/pay`}>Pay now</Link>
                  </Button>
                )}
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/patient/orders/${order.id}`}>Details</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
