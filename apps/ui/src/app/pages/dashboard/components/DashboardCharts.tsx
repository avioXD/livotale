import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardOverview } from '@/types';

interface DashboardChartsProps {
  overview: DashboardOverview;
}

export function DashboardCharts({ overview }: DashboardChartsProps) {
  const cityData = overview.charts.patientsByCity.map((row) => ({
    city: row.city_name,
    patients: Number(row.patients),
  }));

  const trendData = overview.charts.clinicTrends.map((row) => ({
    date: new Date(row.snapshot_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    bmi: row.avg_bmi != null ? Number(row.avg_bmi) : null,
    alt: row.avg_alt != null ? Number(row.avg_alt) : null,
    liverFibrosisScan: row.avg_liver_fibrosis_scan != null ? Number(row.avg_liver_fibrosis_scan) : null,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {cityData.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-4 font-medium">Patients by City</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="city" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="patients" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {trendData.length > 0 && (
        <div className="rounded-lg border p-4 lg:col-span-2">
          <h3 className="mb-4 font-medium">Clinic Trends (30 days)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="bmi" stroke="#e91e8c" strokeWidth={2} dot={false} name="Avg BMI" />
                <Line type="monotone" dataKey="alt" stroke="#14b8a6" strokeWidth={2} dot={false} name="Avg ALT" />
                <Line type="monotone" dataKey="liverFibrosisScan" stroke="#6366f1" strokeWidth={2} dot={false} name="Avg Liver Fibrosis Scan kPa" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
