import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { inboxNotificationService } from '@/services/notifications/InboxNotificationService';
import { useUserRole } from '@/store';
import type { InboxNotification } from '@/types/inboxNotification';

export function StaffNotificationsPage() {
  const role = useUserRole();
  const [items, setItems] = useState<InboxNotification[]>([]);

  const load = async () => setItems(await inboxNotificationService.listForRole(role));

  useEffect(() => {
    void load();
  }, [role]);

  const markRead = (id: string) => {
    void inboxNotificationService.markRead(id).then(() => load());
  };

  const markAll = () => {
    void inboxNotificationService.markAllRead(role).then(() => load());
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Push alerts for your role — enquiries, orders, pathology, AI, consultations."
        actions={
          unread > 0 ? (
            <Button size="sm" variant="outline" onClick={markAll}>Mark all read</Button>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No notifications yet. Actions on orders and enquiries will appear here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <Card key={n.id} className={n.read ? 'opacity-75' : 'border-livotale-pink/30'}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    <Badge variant="outline" className="capitalize">{n.category}</Badge>
                    {!n.read && <Badge>New</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString()} · {n.triggerAction}
                    {n.orderId && (
                      <>
                        {' · '}
                        <Link to={`/admin/orders/${n.orderId}`} className="text-primary underline">Order</Link>
                      </>
                    )}
                  </p>
                </div>
                {!n.read && (
                  <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Full trigger matrix: <code>specs/features/13-notification-triggers.md</code>
      </p>
    </div>
  );
}
