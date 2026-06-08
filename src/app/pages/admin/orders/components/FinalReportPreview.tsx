import type { FinalReportPreviewData } from '@/types/finalReport';
import { DEFAULT_LETTERHEAD } from '@/services/liverCare/finalReports.mock';

interface FinalReportPreviewProps {
  data: FinalReportPreviewData;
}

export function FinalReportPreview({ data }: FinalReportPreviewProps) {
  return (
    <div className="rounded-lg border bg-white p-6 text-sm shadow-sm">
      <div className="border-b border-livotale-pink/30 pb-4 text-center">
        <p className="text-lg font-bold text-livotale-pink">{DEFAULT_LETTERHEAD.companyName}</p>
        <p className="text-xs text-muted-foreground">{DEFAULT_LETTERHEAD.tagline}</p>
        <p className="text-xs text-muted-foreground">{DEFAULT_LETTERHEAD.address}</p>
      </div>

      <div className="mt-4 space-y-1 text-center">
        <h2 className="text-base font-semibold">{data.reportTypeLabel}</h2>
        <p className="text-xs text-muted-foreground">Report ID: {data.reportNumber}</p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <p><span className="text-muted-foreground">Patient:</span> {data.patientName}</p>
        <p><span className="text-muted-foreground">Phone:</span> {data.patientPhone}</p>
        <p><span className="text-muted-foreground">Order:</span> {data.orderNumber}</p>
        <p><span className="text-muted-foreground">Package:</span> {data.packageName}</p>
      </div>

      {data.fibrosisSection && (
        <div className="mt-6">
          <h3 className="mb-2 font-semibold">{data.fibrosisSection.title}</h3>
          <table className="w-full border text-left text-xs">
            <tbody>
              {data.fibrosisSection.rows.map((row) => (
                <tr key={row.label} className="border-t">
                  <td className="px-2 py-1 text-muted-foreground">{row.label}</td>
                  <td className="px-2 py-1 font-medium">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.pathologySection && (
        <div className="mt-6">
          <h3 className="mb-2 font-semibold">{data.pathologySection.title}</h3>
          <table className="w-full border text-left text-xs">
            <tbody>
              {data.pathologySection.rows.map((row) => (
                <tr key={row.label} className="border-t">
                  <td className="px-2 py-1 text-muted-foreground">{row.label}</td>
                  <td className="px-2 py-1 font-medium">
                    {row.value}
                    {row.flag && row.flag !== 'normal' && (
                      <span className="ml-1 text-amber-700">({row.flag})</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 rounded-md bg-muted/40 p-3">
        <p className="font-medium">Interpretation</p>
        <p className="text-muted-foreground">{data.interpretation}</p>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">{data.disclaimer}</p>

      <div className="mt-6 flex items-end justify-between border-t pt-4 text-xs text-muted-foreground">
        <div>
          <p>Authorized by: {data.authorizedBy}</p>
          <p>Generated: {new Date(data.generatedAt).toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="font-mono">{data.qrCodeId}</p>
          <p>{data.footer}</p>
        </div>
      </div>
    </div>
  );
}
