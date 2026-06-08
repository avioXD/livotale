import { FiCopy } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { LiverCareOrder } from '@/types/serviceOrder';
interface TechnicianOrderIdBannerProps {
  order: LiverCareOrder;
  packageCode: string;
}

export function TechnicianOrderIdBanner({ order, packageCode }: TechnicianOrderIdBannerProps) {
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
        Source of truth — order ID
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
        Use this ID on sample labels, device session, and proof photos.
      </p>
      <div className="mt-3">
        <Badge>{packageCode}</Badge>
      </div>
    </div>
  );
}
