import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  aiExtractionOrderService,
  finalReportService,
  pathologyService,
  technicianOrderService,
} from '@/services/liverCare';
import type { FibrosisScanRecord } from '@/types/fibrosisScan';
import type { AIExtractionJob } from '@/types/aiExtraction';
import type { LabReportUpload } from '@/types/labReport';
import type { FinalReport } from '@/types/finalReport';

interface DoctorMedicalSummaryPanelProps {
  orderId: string;
}

export function DoctorMedicalSummaryPanel({ orderId }: DoctorMedicalSummaryPanelProps) {
  const [scan, setScan] = useState<FibrosisScanRecord | null>(null);
  const [labReport, setLabReport] = useState<LabReportUpload | null>(null);
  const [aiJob, setAiJob] = useState<AIExtractionJob | null>(null);
  const [report, setReport] = useState<FinalReport | null>(null);

  useEffect(() => {
    void Promise.all([
      technicianOrderService.getScan(orderId),
      pathologyService.getReport(orderId),
      aiExtractionOrderService.getJobForOrder(orderId),
      finalReportService.getForOrder(orderId),
    ]).then(([s, lr, ai, fr]) => {
      setScan(s);
      setLabReport(lr);
      setAiJob(ai);
      setReport(fr);
    });
  }, [orderId]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Liver Fibrosis Scan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!scan ? (
            <p className="text-muted-foreground">No scan data yet.</p>
          ) : (
            <>
              <p><span className="text-muted-foreground">LSM:</span> {scan.liverStiffnessKpa} kPa</p>
              <p><span className="text-muted-foreground">CAP:</span> {scan.capDbm} dB/m</p>
              <p><span className="text-muted-foreground">IQR/Med:</span> {scan.iqrMedianPercent}%</p>
              <p><span className="text-muted-foreground">Fibrosis stage:</span> {scan.fibrosisStage}</p>
              <p><span className="text-muted-foreground">Steatosis grade:</span> {scan.steatosisGrade}</p>
              {scan.locked && <Badge variant="outline">Locked</Badge>}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pathology</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {!labReport ? (
            <p className="text-muted-foreground">No lab report uploaded.</p>
          ) : (
            <div className="space-y-2">
              <p><span className="text-muted-foreground">Lab:</span> {labReport.partnerLabName}</p>
              <p><span className="text-muted-foreground">Uploaded:</span> {new Date(labReport.uploadedAt).toLocaleDateString()}</p>
              {labReport.fileUrl && (
                <a href={labReport.fileUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                  View PDF
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">AI extraction</CardTitle>
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
                  <tbody>
                    {aiJob.fields.slice(0, 6).map((f) => (
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
          {!report ? (
            <p className="text-muted-foreground">Report not generated yet.</p>
          ) : (
            <div className="space-y-2">
              <p><span className="text-muted-foreground">Report #:</span> {report.reportNumber}</p>
              <Badge className="capitalize">{report.status}</Badge>
              {report.pdfUrl && (
                <a href={report.pdfUrl} target="_blank" rel="noreferrer" className="block text-primary underline">
                  Download report PDF
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

}
