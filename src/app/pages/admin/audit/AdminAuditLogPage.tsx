import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auditLogService } from '@/services/admin/AuditLogService';
import type { AuditLogEntry } from '@/types/adminDashboard';

export function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');

  useEffect(() => {
    void auditLogService.list({
      entityType: entityType || undefined,
      entityId: entityId || undefined,
    }).then(setLogs);
  }, [entityType, entityId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Administrative actions on enquiries, orders, scans, reports, and prescriptions (mock data)."
      />

      <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
        <div className="space-y-1">
          <Label htmlFor="entity-type">Entity type</Label>
          <Input id="entity-type" placeholder="service_order" value={entityType} onChange={(e) => setEntityType(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="entity-id">Entity ID</Label>
          <Input id="entity-id" placeholder="lco-3" value={entityId} onChange={(e) => setEntityId(e.target.value)} />
        </div>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">No audit entries match filters.</CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">By</th>
                <th className="px-3 py-2">Change</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="px-3 py-2">{new Date(log.performedAt).toLocaleString()}</td>
                  <td className="px-3 py-2"><Badge variant="outline">{log.action}</Badge></td>
                  <td className="px-3 py-2">{log.entityType} / {log.entityId}</td>
                  <td className="px-3 py-2">{log.performedBy}</td>
                  <td className="px-3 py-2 text-muted-foreground">{log.newValue ?? log.oldValue ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
