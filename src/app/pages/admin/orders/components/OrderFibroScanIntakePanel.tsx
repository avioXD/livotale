import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/common';
import { LogTextarea, isLogFieldValid } from '@/components/forms/LogTextarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FibroScanIntakeSummary,
} from '@/app/pages/shared/components/PatientIntakeSummary';
import { technicianOrderService } from '@/services/liverCare';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { ScanPatientIntake } from '@/types/scanPatientIntake';

const STATUS_LABELS = {
  pending: 'Awaiting validation',
  approved: 'Validated',
  rejected: 'Rejected',
} as const;

interface OrderFibroScanIntakePanelProps {
  order: LiverCareOrder;
  onUpdated: () => void;
  readOnly?: boolean;
}

export function OrderFibroScanIntakePanel({
  order,
  onUpdated,
  readOnly = false,
}: OrderFibroScanIntakePanelProps) {
  const [intake, setIntake] = useState<ScanPatientIntake | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const row = await technicianOrderService.getPatientIntake(order.id);
    setIntake(row);
    setNotes(row?.fibroscanOperatorNotes ?? '');
  };

  useEffect(() => {
    void load();
  }, [order.id]);

  const run = async (action: () => Promise<unknown>) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      await load();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSaving(false);
    }
  };

  const canValidate =
    !readOnly &&
    intake?.fibroscanIntakeSubmittedAt &&
    (intake.fibroscanOperatorVerificationStatus === 'pending' ||
      intake.fibroscanOperatorVerificationStatus == null);
  const notesValid = isLogFieldValid(notes, 'LOG_MEDIUM');

  if (!intake?.fibroscanIntakeSubmittedAt) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">FibroScan intake (operator)</CardTitle>
          <CardDescription>
            Technician-submitted device session details will appear here after the field visit.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-4 text-sm text-muted-foreground">
          No FibroScan intake submitted by technician yet.
        </CardContent>
      </Card>
    );
  }

  const status = intake.fibroscanOperatorVerificationStatus ?? 'pending';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">FibroScan intake — validate technician submission</CardTitle>
          <StatusBadge status={status} domain="verification" label={STATUS_LABELS[status]} />
        </div>
        <CardDescription>
          Review device patient code and demographics entered on the FibroScan machine. Approve or reject the
          technician submission.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <FibroScanIntakeSummary
          intake={intake}
          title={`Submitted ${new Date(intake.fibroscanIntakeSubmittedAt).toLocaleString()}`}
        />

        {canValidate && (
          <div className="space-y-3 rounded-md border border-dashed p-3">
            <LogTextarea
              limit="LOG_MEDIUM"
              placeholder="Optional notes for approval or rejection reason"
              value={notes}
              onChange={setNotes}
              rows={2}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={saving || !notesValid}
                onClick={() =>
                  run(() => technicianOrderService.operatorVerifyFibroScanIntake(order.id, 'approved', notes))
                }
              >
                Validate FibroScan intake
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={saving || !notesValid}
                onClick={() =>
                  run(() => technicianOrderService.operatorVerifyFibroScanIntake(order.id, 'rejected', notes))
                }
              >
                Reject — send back to technician
              </Button>
            </div>
          </div>
        )}

        {status === 'approved' && intake.fibroscanOperatorVerifiedAt && (
          <p className="text-xs text-muted-foreground">
            Validated {new Date(intake.fibroscanOperatorVerifiedAt).toLocaleString()}
            {intake.fibroscanOperatorNotes ? ` · ${intake.fibroscanOperatorNotes}` : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
