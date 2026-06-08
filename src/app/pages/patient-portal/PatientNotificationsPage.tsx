import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { patientPortalService } from '@/services/liverCare';
import { usePatientPortalStore } from '@/store';
import type { PatientNotification } from '@/types/patientPortal';

const CHANNEL_LABELS: Record<PatientNotification['channel'], string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'Email',
  in_app: 'In-app',
};

export function PatientNotificationsPage() {
  const session = usePatientPortalStore((s) => s.session)!;
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setNotifications(await patientPortalService.listNotifications(session.phone));
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [session.phone]);

  const markRead = async (id: string) => {
    await patientPortalService.markNotificationRead(id);
    setNotifications((rows) => rows.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Dummy in-app inbox — {unread} unread
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/patient">Back</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No notifications yet. Updates about payments, scans, and reports will appear here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className={n.read ? 'opacity-80' : 'border-livotale-pink/40'}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    <Badge variant="outline">{CHANNEL_LABELS[n.channel]}</Badge>
                    {!n.read && <Badge>New</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(n.sentAt).toLocaleString()}
                    {n.orderId && (
                      <>
                        {' · '}
                        <Link to={`/patient/orders/${n.orderId}`} className="text-primary underline">
                          View order
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                {!n.read && (
                  <Button size="sm" variant="ghost" onClick={() => void markRead(n.id)}>
                    Mark read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
