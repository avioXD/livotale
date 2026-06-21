import type { ReactNode } from 'react';
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
import { KpiGrid, KpiInsightCard } from '@/components/common';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardStatCard } from '@/app/pages/dashboard/components/DashboardStatCard';
import type { PatientDashboardData } from '@/types';

interface PatientDashboardPanelProps {
  dashboard: PatientDashboardData;
}

function fmtDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function ChartShell({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function PatientDashboardStats({ dashboard }: PatientDashboardPanelProps) {
  const k = dashboard.kpis;
  const items = [
    { label: 'Liver Score', value: k.liverScore != null ? `${k.liverScore}/100` : '—', accent: 'pink' as const },
    { label: 'Risk Score', value: k.riskScore ?? '—', accent: 'danger' as const },
    { label: 'Compliance', value: k.complianceScore != null ? `${k.complianceScore}%` : '—', accent: 'teal' as const },
    { label: 'BMI', value: k.bmi ?? '—', accent: 'neutral' as const },
    { label: 'Weight', value: k.weightKg != null ? `${k.weightKg} kg` : '—', accent: 'neutral' as const },
    { label: 'Liver Fibrosis Scan', value: k.latestLiverFibrosisScanKpa != null ? `${k.latestLiverFibrosisScanKpa} kPa` : '—', accent: 'indigo' as const },
    { label: 'ALT (SGPT)', value: k.sgpt != null ? `${k.sgpt} U/L` : '—', accent: 'amber' as const },
    { label: 'HbA1c', value: k.hba1c != null ? `${k.hba1c}%` : '—', accent: 'rose' as const },
  ];

  return (
    <KpiGrid>
      {items.map((item) => (
        <DashboardStatCard
          key={item.label}
          label={item.label}
          value={item.value}
          accent={item.accent}
        />
      ))}
    </KpiGrid>
  );
}

function EmptyChart({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>;
}

export function PatientDashboardPanel({ dashboard }: PatientDashboardPanelProps) {
  const trendData = dashboard.trends.map((t) => ({
    date: fmtDate(t.snapshot_date),
    weight: num(t.weight_kg),
    bmi: num(t.bmi),
    alt: num(t.sgpt),
    ast: num(t.sgot),
    liverFibrosisScan: num(t.liverFibrosisScanKpa),
    cap: num(t.cap_dbm),
    hba1c: num(t.hba1c),
    triglycerides: num(t.triglycerides),
    liverScore: num(t.liver_score),
    compliance: num(t.compliance_score),
  }));

  const complianceData = dashboard.compliance.map((c) => ({
    week: fmtDate(c.checkinWeekStart),
    diet: c.dietCompliancePercent ?? 0,
    exercise: c.exerciseCompliancePercent ?? 0,
    medicine: c.medicineCompliancePercent ?? 0,
    weight: c.weightKg,
  }));

  const k = dashboard.kpis;

  return (
    <div className="space-y-6">
      <PatientDashboardStats dashboard={dashboard} />

      <KpiGrid>
        <KpiInsightCard
          label="Care Plan"
          title={k.activePackage ?? 'No active package'}
          accent="pink"
        >
          {k.packageStart && (
            <p>
              {new Date(k.packageStart).toLocaleDateString()} –{' '}
              {k.packageEnd ? new Date(k.packageEnd).toLocaleDateString() : 'ongoing'}
            </p>
          )}
          <p className="mt-1 capitalize">Fibrosis: {k.fibrosisStage ?? '—'} · Steatosis: {k.steatosisGrade ?? '—'}</p>
        </KpiInsightCard>
        <KpiInsightCard label="Latest Labs" title="Metabolic panel" accent="teal">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div><span className="text-muted-foreground">ALT</span><p className="font-medium text-foreground">{k.sgpt ?? '—'} U/L</p></div>
            <div><span className="text-muted-foreground">AST</span><p className="font-medium text-foreground">{k.sgot ?? '—'} U/L</p></div>
            <div><span className="text-muted-foreground">HbA1c</span><p className="font-medium text-foreground">{k.hba1c ?? '—'}%</p></div>
            <div><span className="text-muted-foreground">TG</span><p className="font-medium text-foreground">{k.triglycerides ?? '—'} mg/dL</p></div>
          </div>
        </KpiInsightCard>
        <KpiInsightCard label="Engagement" title="Visits & prescriptions" accent="indigo">
          <p>Home visits: {k.homeVisitsCompleted}/{k.homeVisitsTotal} completed</p>
          <p className="mt-1">Prescriptions: {k.prescriptionsApproved}/{k.prescriptionsTotal} approved</p>
        </KpiInsightCard>
        <KpiInsightCard label="Weekly Check-in" title="Latest compliance" accent="amber">
          <p>Diet {k.dietCompliance ?? '—'}% · Exercise {k.exerciseCompliance ?? '—'}%</p>
          <p className="mt-1">Medicine {k.medicineCompliance ?? '—'}%</p>
          {k.scoreCalculatedAt && (
            <p className="mt-2 text-xs">
              Scores updated {new Date(k.scoreCalculatedAt).toLocaleDateString()}
            </p>
          )}
        </KpiInsightCard>
      </KpiGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartShell title="Body Composition" description="Weight and BMI over time">
          {trendData.length === 0 ? (
            <EmptyChart message="No body composition data." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="weight" stroke="#e91e8c" strokeWidth={2} dot={false} name="Weight (kg)" />
                  <Line yAxisId="right" type="monotone" dataKey="bmi" stroke="#14b8a6" strokeWidth={2} dot={false} name="BMI" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartShell>

        <ChartShell title="Liver Enzymes" description="ALT (SGPT) and AST (SGOT)">
          {trendData.length === 0 ? (
            <EmptyChart message="No liver enzyme data." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="alt" stroke="#f59e0b" strokeWidth={2} dot={false} name="ALT" />
                  <Line type="monotone" dataKey="ast" stroke="#ef4444" strokeWidth={2} dot={false} name="AST" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartShell>

        <ChartShell title="Liver Fibrosis Scan" description="Liver stiffness (kPa) and CAP (dB/m)">
          {trendData.length === 0 ? (
            <EmptyChart message="No Liver Fibrosis Scan data." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="liverFibrosisScan" stroke="#6366f1" strokeWidth={2} dot={false} name="kPa" />
                  <Line yAxisId="right" type="monotone" dataKey="cap" stroke="#8b5cf6" strokeWidth={2} dot={false} name="CAP dB/m" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartShell>

        <ChartShell title="Metabolic Markers" description="HbA1c and triglycerides">
          {trendData.length === 0 ? (
            <EmptyChart message="No metabolic marker data." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="hba1c" stroke="#ec4899" strokeWidth={2} dot={false} name="HbA1c (%)" />
                  <Line yAxisId="right" type="monotone" dataKey="triglycerides" stroke="#0ea5e9" strokeWidth={2} dot={false} name="TG (mg/dL)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartShell>

        <ChartShell title="Liver Score & Compliance" description="Program adherence vs liver score trend" className="lg:col-span-2">
          {trendData.length === 0 ? (
            <EmptyChart message="No score trend data." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="liverScore" stroke="#e91e8c" strokeWidth={2} dot={false} name="Liver Score" />
                  <Line yAxisId="right" type="monotone" dataKey="compliance" stroke="#14b8a6" strokeWidth={2} dot={false} name="Compliance %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartShell>

        <ChartShell title="Weekly Compliance" description="Diet, exercise, and medicine adherence by week" className="lg:col-span-2">
          {complianceData.length === 0 ? (
            <EmptyChart message="No weekly check-in data." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complianceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="diet" fill="#e91e8c" name="Diet %" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="exercise" fill="#14b8a6" name="Exercise %" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="medicine" fill="#6366f1" name="Medicine %" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartShell>
      </div>
    </div>
  );
}
