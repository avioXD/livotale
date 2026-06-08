import type { LiverCarePrescription } from '@/types/consultation';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { DEFAULT_LETTERHEAD } from '@/services/liverCare/finalReports.mock';

interface LiverCarePrescriptionPreviewProps {
  order: LiverCareOrder;
  prescription: LiverCarePrescription;
}

export function LiverCarePrescriptionPreview({ order, prescription }: LiverCarePrescriptionPreviewProps) {
  return (
    <div className="rounded-lg border bg-white p-6 text-sm shadow-sm">
      <div className="border-b border-livotale-pink/30 pb-4 text-center">
        <p className="text-lg font-bold text-livotale-pink">{DEFAULT_LETTERHEAD.companyName}</p>
        <p className="text-xs text-muted-foreground">{DEFAULT_LETTERHEAD.tagline}</p>
        <p className="text-xs text-muted-foreground">{DEFAULT_LETTERHEAD.address}</p>
      </div>

      <div className="mt-4 text-center">
        <h2 className="text-base font-semibold">Prescription</h2>
        <p className="text-xs text-muted-foreground">Rx ID: {prescription.id}</p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <p><span className="text-muted-foreground">Patient:</span> {order.patientName}</p>
        <p><span className="text-muted-foreground">Phone:</span> {order.patientPhone}</p>
        <p><span className="text-muted-foreground">Order:</span> {order.orderNumber}</p>
        <p><span className="text-muted-foreground">Visit date:</span>{' '}
          {prescription.visitDate
            ? new Date(prescription.visitDate).toLocaleString()
            : new Date(prescription.updatedAt).toLocaleDateString()}
        </p>
        {prescription.followUpDate && (
          <p><span className="text-muted-foreground">Follow-up:</span> {new Date(prescription.followUpDate).toLocaleString()}</p>
        )}
      </div>

      <div className="mt-4 rounded-md bg-muted/30 p-3">
        <p className="font-medium">{prescription.doctorName}</p>
        <p className="text-xs text-muted-foreground">{prescription.doctorDegree}</p>
        <p className="text-xs text-muted-foreground">Reg. {prescription.doctorRegistration}</p>
      </div>

      {prescription.diagnosis && (
        <div className="mt-4">
          <p className="font-medium">Diagnosis</p>
          <p className="text-muted-foreground">{prescription.diagnosis}</p>
        </div>
      )}

      {prescription.clinicalNotes && (
        <div className="mt-4">
          <p className="font-medium">Clinical notes</p>
          <p className="text-muted-foreground">{prescription.clinicalNotes}</p>
        </div>
      )}

      {prescription.symptoms && (
        <div className="mt-4">
          <p className="font-medium">Symptoms</p>
          <p className="text-muted-foreground">{prescription.symptoms}</p>
        </div>
      )}

      {prescription.medicines.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 font-medium">Medicines</p>
          <table className="w-full border text-left text-xs">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-2 py-1">#</th>
                <th className="px-2 py-1">Medicine</th>
                <th className="px-2 py-1">Dosage</th>
                <th className="px-2 py-1">Frequency</th>
                <th className="px-2 py-1">Duration</th>
              </tr>
            </thead>
            <tbody>
              {prescription.medicines.map((m, i) => (
                <tr key={m.id} className="border-t">
                  <td className="px-2 py-1">{i + 1}</td>
                  <td className="px-2 py-1">
                    {m.name} {m.strength ? `(${m.strength})` : ''}
                    <span className="block text-muted-foreground capitalize">{m.form} · {m.timing.replaceAll('_', ' ')}</span>
                  </td>
                  <td className="px-2 py-1">{m.dosage}</td>
                  <td className="px-2 py-1">{m.frequency}</td>
                  <td className="px-2 py-1">{m.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {prescription.dietAdvice && (
        <div className="mt-4">
          <p className="font-medium">Diet advice</p>
          <p className="text-muted-foreground">{prescription.dietAdvice}</p>
        </div>
      )}

      {prescription.lifestyleAdvice && (
        <div className="mt-4">
          <p className="font-medium">Lifestyle</p>
          <p className="text-muted-foreground">{prescription.lifestyleAdvice}</p>
        </div>
      )}

      {prescription.followUpAdvice && (
        <div className="mt-4">
          <p className="font-medium">Follow-up</p>
          <p className="text-muted-foreground">{prescription.followUpAdvice}</p>
        </div>
      )}

      {prescription.warningSigns && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="font-medium text-amber-900">Warning signs</p>
          <p className="text-amber-800">{prescription.warningSigns}</p>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        This is a computer-generated prescription. Seek emergency care for acute symptoms.
      </p>

      <div className="mt-6 flex items-end justify-between border-t pt-4">
        <p className="text-xs text-muted-foreground">Digitally signed by {prescription.doctorName}</p>
        {prescription.version > 1 && (
          <p className="text-xs text-muted-foreground">Version {prescription.version}</p>
        )}
      </div>
    </div>
  );
}
