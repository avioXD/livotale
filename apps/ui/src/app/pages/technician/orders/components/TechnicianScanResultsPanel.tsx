import { FiActivity, FiExternalLink, FiRefreshCw } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fibroScanReliability } from '@/app/pages/shared/components/fibroScanKpiConfig';
import type { FibrosisScanRecord } from '@/types/fibrosisScan';
import { cn } from '@/utils';

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
  const reliability = fibroScanReliability(scan.iqrMedianPercent);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FiActivity className="h-4 w-4 text-indigo-500" aria-hidden />
              3. FibroScan results
            </CardTitle>
            <CardDescription className="mt-1">
              Machine KPIs for order <span className="font-mono font-medium">{orderNumber}</span>
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="capitalize">
              {scan.source}
            </Badge>
            <Badge
              variant={reliability.reliable ? 'default' : 'secondary'}
              className={cn(reliability.reliable && 'bg-emerald-600')}
            >
              {reliability.label}
            </Badge>
            {(scan.rescanCount ?? 0) > 0 && <Badge variant="secondary">Rescan #{scan.rescanCount}</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Primary clinical KPIs
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricTile label="Liver stiffness E" value={scan.liverStiffnessKpa} unit="kPa" />
            <MetricTile label="CAP score" value={scan.capDbm} unit="dB/m" />
            <MetricTile label="METAVIR" value={scan.fibrosisStage} />
            <MetricTile label="Steatosis" value={scan.steatosisGrade} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Quality control
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <MetricTile label="IQR (kPa)" value={scan.iqr} />
            <MetricTile label="IQR / Median" value={`${scan.iqrMedianPercent}%`} />
            <MetricTile
              label="Valid / total"
              value={`${scan.validMeasurements}/${scan.totalMeasurements}`}
            />
          </div>
        </div>

        <div className="rounded-lg border-l-4 border-l-indigo-500 bg-indigo-500/5 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Interpretation</p>
          <p className="mt-1 text-sm font-medium leading-snug">{scan.interpretation || '—'}</p>
          {scan.remarks && <p className="mt-2 text-xs text-muted-foreground">{scan.remarks}</p>}
        </div>

        {scan.scanFileUrl && (
          <Button size="sm" variant="outline" className="gap-2" asChild>
            <a href={scan.scanFileUrl} target="_blank" rel="noreferrer">
              <FiExternalLink className="h-4 w-4" aria-hidden />
              View machine report proof
            </a>
          </Button>
        )}

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
