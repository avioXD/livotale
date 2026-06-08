import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getNotificationService } from '@/services/external';
import type { NotificationLogEntry } from '@/services/external/types';

export function AdminLiverCareNotificationsPage() {
  const [logs, setLogs] = useState<NotificationLogEntry[]>([]);
  const [orderFilter, setOrderFilter] = useState('');

  useEffect(() => {
    const rows = getNotificationService().listLogs(
      orderFilter ? { orderId: orderFilter } : undefined,
    );
    setLogs(rows);
  }, [orderFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification log"
        description="Dummy WhatsApp, SMS, email, and in-app dispatch history for liver care orders."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/operations">Operations hub</Link>
          </Button>
        }
      />

      <div className="max-w-xs space-y-1">
        <Label htmlFor="order-filter">Filter by order ID</Label>
        <Input
          id="order-filter"
          placeholder="e.g. lco-3"
          value={orderFilter}
          onChange={(e) => setOrderFilter(e.target.value)}
        />
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No notifications logged yet. Actions like payment links, report publish, and Rx publish create entries.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Recipient</th>
                <th className="px-3 py-2">Template</th>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="px-3 py-2">{log.sentAt ? new Date(log.sentAt).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2 capitalize">{log.channel}</td>
                  <td className="px-3 py-2">{log.recipient}</td>
                  <td className="px-3 py-2 max-w-xs truncate">{log.template}</td>
                  <td className="px-3 py-2">
                    {log.orderId ? (
                      <Link to={`/admin/orders/${log.orderId}`} className="text-primary underline">{log.orderId}</Link>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2"><Badge variant="outline">{log.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
