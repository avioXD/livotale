import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/common';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { partnerLabService } from '@/services/liverCare';
import type { PartnerLab } from '@/types/partnerLab';
import type { TableColumn } from '@/types';

type PartnerLabListRow = PartnerLab & { reportsUploaded: number; inPipeline: number };

export function AdminPartnerLabsPage() {
  const navigate = useNavigate();
  const [labs, setLabs] = useState<PartnerLabListRow[]>([]);
  const [loading, setLoading] = useState(true);

  const openLab = useCallback((id: string) => navigate(`/admin/staff/lab-partners/${id}`), [navigate]);

  useEffect(() => {
    void partnerLabService.listSummaries(false).then((rows) => {
      setLabs(rows);
      setLoading(false);
    });
  }, []);

  const columns: TableColumn<PartnerLabListRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Lab',
        render: (r) => (
          <div>
            <p className="font-medium">{r.name}</p>
            <p className="text-xs text-muted-foreground">
              {r.city}, {r.state}
            </p>
          </div>
        ),
      },
      {
        key: 'contact',
        header: 'Contact',
        render: (r) => (
          <div className="text-sm">
            <p>{r.contactPerson}</p>
            <p className="text-xs text-muted-foreground">{r.email}</p>
          </div>
        ),
      },
      {
        key: 'reports',
        header: 'Reports uploaded',
        render: (r) => r.reportsUploaded,
      },
      {
        key: 'pipeline',
        header: 'In pipeline',
        render: (r) => r.inPipeline,
      },
      {
        key: 'status',
        header: 'Status',
        render: (r) => (
          <Badge variant={r.active ? 'default' : 'outline'}>{r.active ? 'Active' : 'Inactive'}</Badge>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab partners"
        description="Associated pathology lab profiles — contact, legal documents, report volume, and billing. Labs email PDFs; operations uploads on each order."
      />

      <DataTable
        columns={columns}
        data={labs}
        isLoading={loading}
        emptyMessage="No lab partner profiles configured."
        getRowKey={(r) => r.id}
        onRowClick={(r) => openLab(r.id)}
      />

      <p className="text-xs text-muted-foreground">
        Tip: use{' '}
        <Link to="/admin/operations?tab=partner-lab" className="text-livotale-pink hover:underline">
          Operations → Lab reports
        </Link>{' '}
        for live order workflow (dispatch, PDF upload, AI review).
      </p>
    </div>
  );
}
