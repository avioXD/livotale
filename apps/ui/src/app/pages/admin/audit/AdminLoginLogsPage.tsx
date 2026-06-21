import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { authService } from '@/services';
import type { LoginLogEntry } from '@/types';
import { formatLoginFailureReason, formatLoginMethod } from '@/utils/authMappers';

export function AdminLoginLogsPage() {
  const [logs, setLogs] = useState<LoginLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void authService
      .getAllLoginLogs(50)
      .then(setLogs)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load login logs');
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Login activity"
        description="Org-wide password login attempts across all users."
      />

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Loading login activity…
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No login activity recorded yet.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Identifier</th>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">Failure reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    {log.full_name ?? log.username ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {log.identifier_used ?? '—'}
                  </td>
                  <td className="px-3 py-2">{formatLoginMethod(log.login_method)}</td>
                  <td className="px-3 py-2">
                    <Badge variant={log.success ? 'default' : 'destructive'}>
                      {log.success ? 'Success' : 'Failed'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{log.ip_address ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {log.success ? '—' : formatLoginFailureReason(log.failure_reason) ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
