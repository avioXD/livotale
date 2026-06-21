import { Calendar, Heart, Target, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LiverIcon } from '@/components/liver-health-report/LiverIcon';
import { BodyCompositionFigure } from '@/components/liver-health-report/BodyCompositionFigure';
import { CapDonutChart } from '@/components/liver-health-report/report-charts';
import {
  CapRiskSpeedometer,
  LiverAgeRiskSpeedometer,
  LiverHealthScoreSpeedometer,
  LsmRiskSpeedometer,
  RiskSpeedometer,
} from '@/components/liver-health-report/report-speedometers';
import { Progress } from '@/components/ui/progress';
import type { LiverHealthReport, LiverRoadmapStage } from '@/types/liverHealthReport';
import { LIVER_STATUS_BG } from '@/types/liverHealthReport';

interface LiverHealthReportDashboardProps {
  report: LiverHealthReport;
  showReferences?: boolean;
}

const ROADMAP_VARIANT: Record<LiverRoadmapStage, 'healthy' | 'fatty' | 'fibrosis' | 'cirrhosis'> = {
  healthy: 'healthy',
  fatty: 'fatty',
  fibrosis: 'fibrosis',
  cirrhosis: 'cirrhosis',
};

const SUMMARY_ICONS = {
  trophy: Trophy,
  heart: Heart,
  calendar: Calendar,
  target: Target,
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-livotale-pink/20 pb-2 text-lg font-bold tracking-tight text-livotale-pink">
      {children}
    </h2>
  );
}

export function LiverHealthReportDashboard({ report, showReferences = false }: LiverHealthReportDashboardProps) {
  const { header, liverHealthScore, roadmap, fibroScan, liverAge } = report;

  return (
    <div className="space-y-8 rounded-xl border bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-sm sm:p-6">
      {/* Header */}
      <div className="rounded-lg border border-livotale-pink/20 bg-white p-4 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-livotale-pink">LivoTale Liver Care</p>
        <h1 className="mt-1 text-xl font-bold sm:text-2xl">{header.reportTitle}</h1>
        <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{header.patientName}</strong> · {header.patientAge}y · {header.patientSex}</span>
          <span>Report: {header.reportId}</span>
          <span>{header.packageName}</span>
          <span>{new Date(header.generatedAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Page 1 — Executive summary */}
      <section className="space-y-4">
        <SectionTitle>1. Liver Health Score</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-livotale-pink/15">
            <CardContent className="flex flex-col items-center pt-6">
              <LiverHealthScoreSpeedometer
                score={liverHealthScore.score}
                maxScore={liverHealthScore.maxScore}
                verdict={liverHealthScore.verdict}
                status={liverHealthScore.verdictLevel}
              />
              <Badge className={`mt-2 ${LIVER_STATUS_BG[liverHealthScore.verdictLevel]}`}>
                {liverHealthScore.verdict}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">AI-Hybrid Verdict</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              {liverHealthScore.aiHybridSummary}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle>2. Progressive Liver Roadmap</SectionTitle>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {roadmap.stages.map((stage) => {
                const active = stage.id === roadmap.currentStage;
                return (
                  <div
                    key={stage.id}
                    className={`flex flex-col items-center rounded-lg border p-3 text-center transition-all ${
                      active ? 'border-livotale-pink bg-livotale-pink/5 shadow-md ring-2 ring-livotale-pink/30' : 'border-dashed opacity-70'
                    }`}
                  >
                    <LiverIcon variant={ROADMAP_VARIANT[stage.id]} className="mx-auto h-11 w-[4.5rem]" />
                    <p className="mt-2 text-xs font-semibold">{stage.label}</p>
                    <p className="text-[10px] text-muted-foreground">{stage.description}</p>
                    {active && (
                      <Badge variant="secondary" className="mt-2 text-[10px]">You are here</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionTitle>3. FibroScan Results</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <LsmRiskSpeedometer
                value={fibroScan.liverStiffnessKpa}
                label="Liver Stiffness (LSM)"
                sublabel={`${fibroScan.stiffnessStage} · ${fibroScan.stiffnessStatus}`}
                status={fibroScan.stiffnessStatus}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <CapRiskSpeedometer
                value={fibroScan.capDbm}
                label="CAP Score (Steatosis)"
                sublabel={fibroScan.steatosisGrade}
                status={fibroScan.steatosisStatus}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle>4. Liver Age &amp; Recovery</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardContent className="flex flex-col items-center pt-6">
              <LiverAgeRiskSpeedometer
                liverAge={liverAge.liverAgeYears}
                actualAge={liverAge.actualAgeYears}
                status={liverAge.ageGapYears > 5 ? 'high' : liverAge.ageGapYears > 2 ? 'caution' : 'normal'}
              />
              <p className="mt-1 text-center text-xs text-muted-foreground">
                Actual age: {liverAge.actualAgeYears} years
              </p>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm">
                Your liver is biologically <strong className="text-livotale-pink">{liverAge.ageGapYears} years older</strong> than your actual age.
              </p>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>Recovery Potential</span>
                  <span className="font-bold text-livotale-teal">{liverAge.recoveryPotentialPercent}% — {liverAge.recoveryLabel}</span>
                </div>
                <Progress
                  value={liverAge.recoveryPotentialPercent}
                  className="h-4 bg-muted"
                  indicatorClassName="bg-gradient-to-r from-livotale-teal to-green-500"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle>5. 5-Year Progression Risk Matrix</SectionTitle>
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
            {report.progressionRisks.map((r) => (
              <RiskSpeedometer key={r.id} label={r.label} percent={r.percent} status={r.level} />
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionTitle>6. At A Glance</SectionTitle>
        <Card>
          <CardContent className="overflow-x-auto pt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">Parameter</th>
                  <th className="py-2 pr-4">Result</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.atAGlance.map((row) => (
                  <tr key={row.parameter} className="border-b border-dashed last:border-0">
                    <td className="py-2 pr-4 text-muted-foreground">{row.parameter}</td>
                    <td className="py-2 pr-4 font-medium">
                      {row.result}{row.unit ? ` ${row.unit}` : ''}
                    </td>
                    <td className="py-2">
                      <Badge variant="outline" className={LIVER_STATUS_BG[row.status]}>
                        {row.statusLabel}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <Card className="border-livotale-teal/30 bg-livotale-teal/5">
        <CardContent className="flex gap-3 pt-4 text-sm">
          <LiverIcon variant={ROADMAP_VARIANT[roadmap.currentStage]} className="h-10 w-14 shrink-0" />
          <div>
            <p className="font-semibold text-livotale-teal">Key Insight</p>
            <p className="text-muted-foreground">{report.keyInsight}</p>
          </div>
        </CardContent>
      </Card>

      {/* Page 2 — Clinical detail */}
      {header.pathologyIncluded && report.biomarkers.length > 1 && (
        <section className="space-y-4">
          <SectionTitle>7. Detailed Biomarkers</SectionTitle>
          <Card>
            <CardContent className="overflow-x-auto pt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">Parameter</th>
                    <th className="py-2 pr-3">Result</th>
                    <th className="py-2 pr-3">Optimal Range</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.biomarkers.map((row) => (
                    <tr key={row.parameter} className="border-b border-dashed last:border-0">
                      <td className="py-2 pr-3">{row.parameter}</td>
                      <td className="py-2 pr-3 font-medium">
                        {row.result}{row.unit ? ` ${row.unit}` : ''}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{row.optimalRange}</td>
                      <td className="py-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: row.status === 'normal' ? '#22c55e' : row.status === 'caution' ? '#f59e0b' : '#ef4444' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="space-y-4">
        <SectionTitle>8. Non-Invasive Scores</SectionTitle>
        <Card>
          <CardContent className="overflow-x-auto pt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">Score</th>
                  <th className="py-2 pr-3">Value</th>
                  <th className="py-2 pr-3">Interpretation</th>
                  <th className="py-2">Reference</th>
                </tr>
              </thead>
              <tbody>
                {report.nonInvasiveScores.map((row) => (
                  <tr key={row.name} className="border-b border-dashed last:border-0">
                    <td className="py-2 pr-3 font-medium">{row.name}</td>
                    <td className="py-2 pr-3">{row.value}</td>
                    <td className="py-2 pr-3">
                      <Badge variant="outline" className={LIVER_STATUS_BG[row.status]}>{row.interpretation}</Badge>
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">{row.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-4">
          <SectionTitle>9. Body Composition</SectionTitle>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <BodyCompositionFigure />
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><p className="text-muted-foreground">Weight</p><p className="font-bold">{report.bodyComposition.weightKg} kg</p></div>
                <div><p className="text-muted-foreground">Height</p><p className="font-bold">{report.bodyComposition.heightCm} cm</p></div>
                <div><p className="text-muted-foreground">BMI</p><p className="font-bold">{report.bodyComposition.bmi}</p></div>
                <div><p className="text-muted-foreground">Target weight</p><p className="font-bold text-green-700">{report.bodyComposition.targetWeightKg} kg</p></div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <SectionTitle>10. Liver Fat Analysis</SectionTitle>
          <Card>
            <CardContent className="pt-6">
              <CapDonutChart
                capDbm={report.liverFat.capDbm}
                steatosisGrade={report.liverFat.steatosisGrade}
                stages={report.liverFat.stages}
              />
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Page 3 — Action plan */}
      <section className="space-y-4">
        <SectionTitle>11. Your Personalized Liver Prescription</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {report.prescription.map((col) => (
            <Card
              key={col.title}
              className={
                col.tone === 'positive'
                  ? 'border-green-200 bg-green-50/50'
                  : col.tone === 'negative'
                    ? 'border-red-200 bg-red-50/50'
                    : 'border-blue-200 bg-blue-50/50'
              }
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{col.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {col.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span>{col.tone === 'positive' ? '✓' : col.tone === 'negative' ? '✗' : '•'}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle>12. Action Plan &amp; Follow-up</SectionTitle>
        <Card>
          <CardContent className="pt-4">
            <ul className="space-y-2 text-sm">
              {report.actionPlan.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <span className="mt-0.5 text-livotale-teal">☐</span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionTitle>13. AI Summary &amp; Next Steps</SectionTitle>
        <Card>
          <CardContent className="space-y-4 pt-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{report.aiSummary}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {report.aiSummaryCards.map((card) => {
                const Icon = SUMMARY_ICONS[card.icon];
                return (
                  <div
                    key={card.id}
                    className="rounded-lg border bg-white p-3 text-center shadow-sm"
                  >
                    <Icon className="mx-auto mb-2 h-6 w-6 text-livotale-pink" />
                    <p className="text-xs text-muted-foreground">{card.title}</p>
                    <p className="text-lg font-bold">{card.value}</p>
                    {card.subtitle && <p className="text-[10px] text-muted-foreground">{card.subtitle}</p>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      {showReferences && (
        <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Clinical references</p>
          <ul className="mt-1 list-inside list-disc">
            {report.clinicalReferences.map((ref) => (
              <li key={ref}>{ref}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
