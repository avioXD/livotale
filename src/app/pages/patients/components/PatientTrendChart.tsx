import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PatientTrendPoint } from '@/types';

interface PatientTrendChartProps {
  trends: PatientTrendPoint[];
}

export function PatientTrendChart({ trends }: PatientTrendChartProps) {
  if (!trends.length) {
    return <p className="text-sm text-muted-foreground">No trend data yet.</p>;
  }

  const data = trends.map((t) => ({
    date: new Date(t.snapshot_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    bmi: t.bmi != null ? Number(t.bmi) : null,
    alt: t.sgpt != null ? Number(t.sgpt) : null,
    Liver Fibrosis Scan: t.Liver Fibrosis Scan_kpa != null ? Number(t.Liver Fibrosis Scan_kpa) : null,
    weight: t.weight_kg != null ? Number(t.weight_kg) : null,
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="weight" stroke="#e91e8c" strokeWidth={2} dot={false} name="Weight (kg)" />
          <Line type="monotone" dataKey="bmi" stroke="#14b8a6" strokeWidth={2} dot={false} name="BMI" />
          <Line type="monotone" dataKey="alt" stroke="#f59e0b" strokeWidth={2} dot={false} name="ALT" />
          <Line type="monotone" dataKey="Liver Fibrosis Scan" stroke="#6366f1" strokeWidth={2} dot={false} name="Liver Fibrosis Scan kPa" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
