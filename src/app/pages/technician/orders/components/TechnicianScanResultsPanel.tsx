import { FiActivity, FiRefreshCw } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FibrosisScanRecord } from '@/types/fibrosisScan';

interface TechnicianScanResultsPanelProps {
  scan: FibrosisScanRecord;
  orderNumber: string;
  acting: boolean;
  onRescan: () => void;
  onEdit: () => void;
}

function MetricTile({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums leading-none">
        {value}
        {unit && <span className="ml-0.5 text-sm font-medium text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}

export function TechnicianScanResultsPanel({
  scan,
  orderNumber,
  acting,
  onRescan,
  onEdit,
}: TechnicianScanResultsPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FiActivity className="h-4 w-4 text-indigo-500" aria-hidden />
              Scan results
            </CardTitle>
            <CardDescription className="mt-1">
              Review captured data for order <span className="font-mono font-medium">{orderNumber}</span>
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="capitalize">
              {scan.source}
            </Badge>
            {(scan.rescanCount ?? 0) > 0 && (
              <Badge variant="secondary">Rescan #{scan.rescanCount}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricTile label="LSM" value={scan.liverStiffnessKpa} unit="kPa" />
          <MetricTile label="CAP" value={scan.capDbm} unit="dB/m" />
          <MetricTile label="Fibrosis" value={scan.fibrosisStage} />
          <MetricTile label="Steatosis" value={scan.steatosisGrade} />
          <MetricTile label="IQR/Median" value={`${scan.iqrMedianPercent}%`} />
          <MetricTile label="Success rate" value={`${scan.successRatePercent}%`} />
        </div>

        <div className="rounded-lg border-l-4 border-l-indigo-500 bg-indigo-500/5 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Interpretation</p>
          <p className="mt-1 text-sm font-medium leading-snug">{scan.interpretation || '—'}</p>
          {scan.remarks && (
            <p className="mt-2 text-xs text-muted-foreground">{scan.remarks}</p>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <div>
            <dt>Probe</dt>
            <dd className="font-medium text-foreground">{scan.probeType}</dd>
          </div>
          <div>
            <dt>BMI</dt>
            <dd className="font-medium text-foreground">{scan.bmi}</dd>
          </div>
          <div>
            <dt>Valid / total</dt>
            <dd className="font-medium text-foreground">
              {scan.validMeasurements}/{scan.totalMeasurements}
            </dd>
          </div>
          <div>
            <dt>Captured</dt>
            <dd className="font-medium text-foreground">
              {new Date(scan.scanAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </dd>
          </div>
        </dl>

        {!scan.locked && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled={acting} onClick={onEdit}>
              Edit scan data
            </Button>
            <Button variant="secondary" size="sm" className="w-full gap-2 sm:w-auto" disabled={acting} onClick={onRescan}>
              <FiRefreshCw className="h-4 w-4" aria-hidden />
              Rescan
            </Button>
          </div>
        )}

        {scan.locked && (
          <p className="text-xs text-muted-foreground">
            Scan is locked — contact operations if a rescan is required.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
