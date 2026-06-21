import { Cell, Pie, PieChart } from 'recharts';
import {
  buildStyles,
  CircularProgressbarWithChildren,
} from 'react-circular-progressbar';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { LIVER_STATUS_COLORS, type LiverHealthStatus } from '@/types/liverHealthReport';

interface RadialGaugeProps {
  value: number;
  max?: number;
  label: string;
  sublabel?: string;
  unit?: string;
  status?: LiverHealthStatus;
  /** half = speedometer arc, full = complete ring */
  variant?: 'half' | 'full';
  className?: string;
  showLabel?: boolean;
}

function gaugeStyles(status: LiverHealthStatus, variant: 'half' | 'full') {
  return buildStyles({
    rotation: variant === 'half' ? 0.75 : 0.25,
    strokeLinecap: 'round',
    pathColor: LIVER_STATUS_COLORS[status],
    trailColor: 'hsl(var(--muted))',
    pathTransitionDuration: 0.6,
  });
}

/** Circular / speedometer gauge — react-circular-progressbar */
export function CircularGauge({
  value,
  max = 100,
  label,
  sublabel,
  unit,
  status = 'normal',
  variant = 'half',
  className,
  showLabel = true,
}: RadialGaugeProps) {
  const isHalf = variant === 'half';
  const clamped = Math.min(max, Math.max(0, value));

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div
        className={cn(
          'relative mx-auto',
          isHalf ? 'h-[128px] w-[220px]' : 'aspect-square h-[160px] w-[160px]',
        )}
      >
        <CircularProgressbarWithChildren
          value={clamped}
          minValue={0}
          maxValue={max}
          circleRatio={isHalf ? 0.5 : 1}
          strokeWidth={10}
          styles={gaugeStyles(status, variant)}
        >
          <div
            className={cn(
              'flex flex-col items-center text-center',
              isHalf ? 'mt-6' : 'mt-0',
            )}
          >
            <p className="text-2xl font-bold leading-none tabular-nums text-foreground">
              {value}
              {unit && (
                <span className="ml-0.5 text-sm font-medium text-muted-foreground">{unit}</span>
              )}
            </p>
            {sublabel && (
              <p className="mt-1 max-w-[160px] text-[10px] leading-tight text-muted-foreground">
                {sublabel}
              </p>
            )}
          </div>
        </CircularProgressbarWithChildren>
      </div>
      {showLabel && label ? (
        <p className="mt-2 text-center text-sm font-medium">{label}</p>
      ) : null}
    </div>
  );
}

export function SemiCircularGauge({
  value,
  max = 80,
  label,
  compareLabel,
  status = 'caution',
}: {
  value: number;
  max?: number;
  label: string;
  compareLabel?: string;
  status?: LiverHealthStatus;
}) {
  return (
    <div className="w-full">
      <CircularGauge
        value={value}
        max={max}
        label={label}
        sublabel="Years"
        status={status}
        variant="half"
        showLabel={false}
      />
      <p className="-mt-1 text-center text-sm font-semibold">{label}</p>
      {compareLabel && <p className="text-center text-xs text-muted-foreground">{compareLabel}</p>}
    </div>
  );
}

const CAP_STAGE_COLORS = ['#22c55e', '#84cc16', '#f59e0b', '#ef4444'];

/** CAP steatosis donut — Recharts PieChart */
export function CapDonutChart({
  capDbm,
  steatosisGrade,
  stages,
}: {
  capDbm: number;
  steatosisGrade: string;
  stages: { grade: string; label: string; range: string; active: boolean }[];
}) {
  const activeIndex = stages.findIndex((s) => s.active);
  const pieData = stages.map((s, i) => ({
    name: s.grade,
    value: 1,
    fill: i === activeIndex ? CAP_STAGE_COLORS[i] : '#e5e7eb',
  }));

  const chartConfig = stages.reduce<ChartConfig>((acc, s, i) => {
    acc[s.grade] = { label: s.label, color: CAP_STAGE_COLORS[i] };
    return acc;
  }, {});

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative w-full max-w-[160px]">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[160px]">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="100%"
              strokeWidth={2}
              stroke="hsl(var(--background))"
              paddingAngle={2}
            >
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums">{capDbm}</span>
          <span className="text-[10px] text-muted-foreground">dB/m</span>
          <span className="mt-0.5 text-xs font-medium">{steatosisGrade}</span>
        </div>
      </div>
      <div className="space-y-1.5 text-xs">
        {stages.map((s, i) => (
          <div key={s.grade} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: CAP_STAGE_COLORS[i] }}
            />
            <span className={s.active ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
              {s.grade} — {s.label} ({s.range})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
