import { FiCopy } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PatientIntakeSummary } from '@/app/pages/shared/components/PatientIntakeSummary';
import { patientIntakeFromOrder } from '@/app/pages/shared/components/patientIntakeUtils';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { ScanPatientIntake } from '@/types/scanPatientIntake';

interface TechnicianOrderIdBannerProps {
  order: LiverCareOrder;
  packageCode: string;
  intake?: ScanPatientIntake | null;
}

function intakeForDisplay(order: LiverCareOrder, intake: ScanPatientIntake | null | undefined): ScanPatientIntake {
  if (intake) return intake;
  const seed = patientIntakeFromOrder(order);
  return {
    orderId: order.id,
    ...seed,
    operatorVerificationStatus: 'approved',
  };
}

export function TechnicianOrderIdBanner({ order, packageCode, intake }: TechnicianOrderIdBannerProps) {
  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(order.orderNumber);
    } catch {
      // clipboard unavailable in some contexts
    }
  };

  return (
    <div className="rounded-xl border-2 border-livotale-pink/30 bg-gradient-to-br from-livotale-pink/[0.08] to-card p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Order ID
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="font-mono text-xl font-bold tracking-tight text-livotale-pink sm:text-2xl">
          {order.orderNumber}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2.5"
          onClick={() => void copyOrderId()}
        >
          <FiCopy className="h-3.5 w-3.5" aria-hidden />
          Copy
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Use this ID for the FibroScan device session and report proof upload.
      </p>
      <div className="mt-3">
        <Badge>{packageCode}</Badge>
      </div>

      <div className="mt-4 border-t border-livotale-pink/20 pt-4">
        <PatientIntakeSummary intake={intakeForDisplay(order, intake)} title="Basic details" />
      </div>
    </div>
  );
}
