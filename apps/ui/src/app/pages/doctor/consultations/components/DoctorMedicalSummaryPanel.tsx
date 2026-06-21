import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LiverHealthReportDashboard } from '@/components/liver-health-report/LiverHealthReportDashboard';
import type { AIExtractionJob } from '@/types/aiExtraction';
import type { FibrosisScanRecord } from '@/types/fibrosisScan';
import type { FinalReport } from '@/types/finalReport';
import type { LabReportUpload } from '@/types/labReport';
import type { LiverHealthReport } from '@/types/liverHealthReport';

interface DoctorMedicalSummaryPanelProps {
  scan: FibrosisScanRecord | null;
  labReport: LabReportUpload | null;
  aiJob: AIExtractionJob | null;
  finalReport: FinalReport | null;
  liverHealthReport: LiverHealthReport | null;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function DoctorMedicalSummaryPanel({
  scan,
  labReport,
  aiJob,
  finalReport,
  liverHealthReport,
}: DoctorMedicalSummaryPanelProps) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">AI-Hybrid Liver Health Report</h3>
          {scan && (
            <Badge variant="secondary" className="capitalize">
              {labReport ? 'Scan + Pathology' : 'Scan only'}
            </Badge>
          )}
        </div>
        {liverHealthReport ? (
          <LiverHealthReportDashboard report={liverHealthReport} showReferences />
        ) : (
          <p className="py-6 text-sm text-muted-foreground">
            {scan
              ? 'Scan or pathology data not ready for AI report generation.'
              : 'No scan data yet.'}
          </p>
        )}
      </div>

      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mb-2 gap-1 text-muted-foreground"
          onClick={() => setShowRaw((v) => !v)}
        >
          {showRaw ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showRaw ? 'Hide' : 'Show'} raw clinical data
        </Button>

        {showRaw && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Liver Fibrosis Scan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {!scan ? (
                  <p className="text-muted-foreground">No scan data yet.</p>
                ) : (
                  <>
                    <DetailRow label="LSM (stiffness)" value={`${scan.liverStiffnessKpa} kPa`} />
                    <DetailRow label="CAP (steatosis)" value={`${scan.capDbm} dB/m`} />
                    <DetailRow label="IQR" value={scan.iqr} />
                    <DetailRow label="IQR/Med" value={`${scan.iqrMedianPercent}%`} />
                    <DetailRow label="Valid / total measurements" value={`${scan.validMeasurements} / ${scan.totalMeasurements}`} />
                    <DetailRow label="Success rate" value={`${scan.successRatePercent}%`} />
                    <DetailRow label="Probe type" value={scan.probeType} />
                    <DetailRow label="Scan date" value={new Date(scan.scanAt).toLocaleString()} />
                    <DetailRow label="Operator" value={scan.operatorName} />
                    <DetailRow label="Device serial" value={scan.deviceSerial} />
                    <DetailRow label="Fasting" value={scan.fastingStatus ? 'Yes' : 'No'} />
                    <DetailRow label="BMI" value={scan.bmi} />
                    <DetailRow label="Fibrosis stage" value={scan.fibrosisStage} />
                    <DetailRow label="Steatosis grade" value={scan.steatosisGrade} />
                    <DetailRow label="Interpretation" value={scan.interpretation} />
                    {scan.remarks && <DetailRow label="Remarks" value={scan.remarks} />}
                    {scan.rescanCount != null && scan.rescanCount > 0 && (
                      <DetailRow label="Rescan count" value={scan.rescanCount} />
                    )}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {scan.locked && <Badge variant="outline">Locked</Badge>}
                      <Badge variant="secondary" className="capitalize">{scan.source}</Badge>
                      {scan.scanFileUrl && (
                        <a href={scan.scanFileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                          Scan file
                        </a>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pathology report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {!labReport ? (
                  <p className="text-muted-foreground">No lab report uploaded.</p>
                ) : (
                  <>
                    <DetailRow label="Partner lab" value={labReport.partnerLabName} />
                    <DetailRow label="File" value={labReport.fileName} />
                    <DetailRow label="Uploaded" value={new Date(labReport.uploadedAt).toLocaleString()} />
                    <DetailRow label="Uploaded by" value={labReport.uploadedBy} />
                    <DetailRow label="Extraction" value={
                      <Badge variant="outline" className="capitalize">{labReport.extractionStatus}</Badge>
                    } />
                    <DetailRow label="Final status" value={
                      <Badge variant="outline" className="capitalize">{labReport.finalStatus}</Badge>
                    } />
                    {labReport.emailFrom && (
                      <DetailRow label="Email from" value={labReport.emailFrom} />
                    )}
                    {labReport.emailSubject && (
                      <DetailRow label="Email subject" value={labReport.emailSubject} />
                    )}
                    {labReport.verifiedAt && (
                      <DetailRow label="Verified" value={new Date(labReport.verifiedAt).toLocaleString()} />
                    )}
                    {labReport.fileUrl && (
                      <a href={labReport.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-primary underline">
                        View pathology PDF
                      </a>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">AI extraction (pathology)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {!aiJob ? (
                  <p className="text-muted-foreground">No AI extraction data.</p>
                ) : (
                  <div className="space-y-2">
                    <Badge variant="outline" className="capitalize">{aiJob.status}</Badge>
                    {aiJob.verifiedAt && (
                      <p className="text-muted-foreground">Verified {new Date(aiJob.verifiedAt).toLocaleDateString()}</p>
                    )}
                    {aiJob.fields?.length ? (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-1">Parameter</th>
                            <th className="py-1">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aiJob.fields.map((f) => (
                            <tr key={f.id} className="border-t">
                              <td className="py-1 text-muted-foreground">{f.fieldName}</td>
                              <td className="py-1 font-medium">{f.editableValue}{f.unit ? ` ${f.unit}` : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Final report</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {!finalReport ? (
                  <p className="text-muted-foreground">Report not generated yet.</p>
                ) : (
                  <div className="space-y-2">
                    <DetailRow label="Report #" value={finalReport.reportNumber} />
                    <DetailRow label="Status" value={
                      <Badge className="capitalize">{finalReport.status}</Badge>
                    } />
                    {finalReport.publishedAt && (
                      <DetailRow label="Published" value={new Date(finalReport.publishedAt).toLocaleString()} />
                    )}
                    {finalReport.pdfUrl && (
                      <a href={finalReport.pdfUrl} target="_blank" rel="noreferrer" className="block text-primary underline">
                        Download report PDF
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
