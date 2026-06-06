import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import type { Patient, TableColumn } from '@/types';

export const patientColumns: TableColumn<Patient>[] = [
  {
    key: 'name',
    header: 'Patient',
    render: (p) => (
      <Link to={`/patients/${p.id}`} className="font-medium text-primary hover:underline">
        {p.fullName}
      </Link>
    ),
  },
  { key: 'code', header: 'MR No.', render: (p) => p.patientCode ?? '—' },
  {
    key: 'bmi',
    header: 'BMI',
    render: (p) => (p.bmi != null ? Number(p.bmi).toFixed(1) : '—'),
  },
  {
    key: 'risk',
    header: 'Risk',
    render: (p) => {
      const score = p.riskScore;
      if (score == null) return '—';
      const variant = score >= 70 ? 'destructive' : score >= 40 ? 'secondary' : 'outline';
      return <Badge variant={variant}>{score}</Badge>;
    },
  },
  {
    key: 'liver',
    header: 'Liver Score',
    render: (p) => (p.liverScore != null ? p.liverScore : '—'),
  },
  {
    key: 'status',
    header: 'Status',
    render: (p) => (
      <span className="capitalize rounded-full bg-muted px-2 py-0.5 text-xs">{p.status}</span>
    ),
  },
];
