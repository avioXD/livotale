import ReactSpeedometer from 'react-d3-speedometer';
import { cn } from '@/lib/utils';
import { LIVER_STATUS_COLORS, type LiverHealthStatus } from '@/types/liverHealthReport';

/** Green → amber → orange → red risk bands */
const RISK_SEGMENT_COLORS = ['#4ade80', '#fbbf24', '#fb923c', '#f87171'];
const PERCENT_RISK_STOPS = [0, 25, 45, 65, 100];
const HEALTH_SCORE_STOPS = [0, 55, 70, 85, 100];
/** Low score = red, high score = green */
const HEALTH_SCORE_COLORS = ['#f87171', '#fb923c', '#fbbf24', '#4ade80'];
const LSM_RISK_STOPS = [0, 6, 8, 12, 20];
const CAP_RISK_STOPS = [0, 238, 260, 290, 400];

interface RiskSpeedometerProps {
  label: string;
  value: number;
  minValue?: number;
  maxValue?: number;
  unit?: string;
  status?: LiverHealthStatus;
  customSegmentStops?: number[];
  segmentColors?: string[];
  compact?: boolean;
  large?: boolean;
  valueText?: string;
  className?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function RiskSpeedometerBase({
  label,
  value,
  minValue = 0,
  maxValue = 100,
  unit = '%',
  status = 'normal',
  customSegmentStops = PERCENT_RISK_STOPS,
  segmentColors = RISK_SEGMENT_COLORS,
  compact = false,
  large = false,
  valueText,
  className,
}: RiskSpeedometerProps) {
  const clamped = clamp(value, minValue, maxValue);
  const width = large ? 280 : compact ? 168 : 200;
  const height = large ? 175 : compact ? 118 : 132;

  const displayValue =
    valueText ??
    (unit === '%' ? `${Math.round(clamped)}%` : unit === '/100' ? `${Math.round(clamped)}/100` : `${clamped} ${unit}`);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <p className={cn('mb-1 w-full text-center font-medium text-muted-foreground', large ? 'text-sm' : 'text-xs')}>
        {label}
      </p>
      <div className="w-full" style={{ maxWidth: width }}>
        <ReactSpeedometer
          value={clamped}
          minValue={minValue}
          maxValue={maxValue}
          customSegmentStops={customSegmentStops}
          segmentColors={segmentColors}
          width={width}
          height={height}
          ringWidth={large ? 32 : compact ? 22 : 26}
          needleColor={LIVER_STATUS_COLORS[status]}
          needleHeightRatio={0.72}
          textColor="hsl(var(--foreground))"
          currentValueText={displayValue}
          valueTextFontSize={large ? '22px' : compact ? '14px' : '16px'}
          labelFontSize="0px"
          maxSegmentLabels={0}
          paddingVertical={6}
          needleTransitionDuration={700}
        />
      </div>
    </div>
  );
}

/** Liver Health Score — 0–100 (higher is better) */
export function LiverHealthScoreSpeedometer({
  score,
  maxScore,
  verdict,
  status,
}: {
  score: number;
  maxScore: number;
  verdict: string;
  status: LiverHealthStatus;
}) {
  return (
    <div className="flex flex-col items-center">
      <RiskSpeedometerBase
        label="Liver Health Score"
        value={score}
        minValue={0}
        maxValue={maxScore}
        unit="/100"
        status={status}
        customSegmentStops={HEALTH_SCORE_STOPS}
        segmentColors={HEALTH_SCORE_COLORS}
        large
        valueText={`${Math.round(score)}/${maxScore}`}
      />
      <p className="-mt-1 max-w-[260px] text-center text-xs text-muted-foreground">{verdict}</p>
    </div>
  );
}

/** 5-year progression risk — percent scale */
export function RiskSpeedometer({
  label,
  percent,
  status,
}: {
  label: string;
  percent: number;
  status: LiverHealthStatus;
}) {
  return (
    <RiskSpeedometerBase
      label={label}
      value={percent}
      minValue={0}
      maxValue={100}
      unit="%"
      status={status}
      customSegmentStops={PERCENT_RISK_STOPS}
      compact
    />
  );
}

/** FibroScan LSM (kPa) — clinical stiffness risk bands */
export function LsmRiskSpeedometer({
  value,
  label,
  sublabel,
  status,
}: {
  value: number;
  label: string;
  sublabel?: string;
  status: LiverHealthStatus;
}) {
  return (
    <div className="flex flex-col items-center">
      <RiskSpeedometerBase
        label={label}
        value={value}
        minValue={0}
        maxValue={20}
        unit="kPa"
        status={status}
        customSegmentStops={LSM_RISK_STOPS}
      />
      {sublabel && (
        <p className="-mt-1 text-center text-[10px] text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
}

/** CAP steatosis (dB/m) — S0–S3 risk bands */
export function CapRiskSpeedometer({
  value,
  label,
  sublabel,
  status,
}: {
  value: number;
  label: string;
  sublabel?: string;
  status: LiverHealthStatus;
}) {
  return (
    <div className="flex flex-col items-center">
      <RiskSpeedometerBase
        label={label}
        value={value}
        minValue={0}
        maxValue={400}
        unit="dB/m"
        status={status}
        customSegmentStops={CAP_RISK_STOPS}
      />
      {sublabel && (
        <p className="-mt-1 text-center text-[10px] text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
}

/** Liver age vs biological aging risk */
export function LiverAgeRiskSpeedometer({
  liverAge,
  actualAge,
  status,
}: {
  liverAge: number;
  actualAge: number;
  status: LiverHealthStatus;
}) {
  const maxAge = Math.max(80, liverAge + 5);
  const stops = [0, actualAge, actualAge + 5, actualAge + 10, maxAge];

  return (
    <RiskSpeedometerBase
      label="Liver Age"
      value={liverAge}
      minValue={0}
      maxValue={maxAge}
      unit="yrs"
      status={status}
      customSegmentStops={stops}
    />
  );
}
