import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { bankDetailsService } from '@/services/bank/BankDetailsService';
import type { BankDetailsFull, BankDetailsMasked, BankVerificationStatus } from '@/types/bankDetails';

function verificationBadgeVariant(status: BankVerificationStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'verified':
      return 'default';
    case 'rejected':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function formatAccountNumber(
  details: BankDetailsFull | BankDetailsMasked,
  masked: boolean,
): string {
  if (!masked && 'accountNumber' in details && details.accountNumber) {
    return details.accountNumber;
  }
  if (details.accountNumberLast4) {
    return `****${details.accountNumberLast4}`;
  }
  return '—';
}

interface BankDetailsAdminPanelProps {
  userId: string;
  canVerify: boolean;
  masked: boolean;
}

export function BankDetailsAdminPanel({ userId, canVerify, masked }: BankDetailsAdminPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<BankDetailsFull | BankDetailsMasked | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showReject, setShowReject] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bankDetailsService.getForUser(userId);
      setDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bank details');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleVerify = async (status: 'verified' | 'rejected') => {
    setSaving(true);
    setError(null);
    try {
      const updated = await bankDetailsService.verify(
        userId,
        status,
        status === 'rejected' ? rejectNotes.trim() || undefined : undefined,
      );
      setDetails(updated);
      setShowReject(false);
      setRejectNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading bank details…</p>;
  }

  if (!details) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No bank details on file for this user.
        </CardContent>
      </Card>
    );
  }

  const verificationNotes =
    'verificationNotes' in details ? details.verificationNotes : null;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      {details.requiredForPayout && details.verificationStatus !== 'verified' && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Required for payout — verification must be completed before disbursement.
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Bank / payout details</CardTitle>
            <CardDescription>
              {masked ? 'Masked view — full account number hidden.' : 'Full account details (admin view).'}
            </CardDescription>
          </div>
          <Badge variant={verificationBadgeVariant(details.verificationStatus)} className="capitalize">
            {details.verificationStatus}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Account holder</dt>
              <dd className="font-medium">{details.accountHolderName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Account number</dt>
              <dd className="font-medium font-mono">{formatAccountNumber(details, masked)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">IFSC</dt>
              <dd className="font-medium font-mono">{details.ifscCode ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Bank</dt>
              <dd className="font-medium">{details.bankName ?? '—'}</dd>
            </div>
            {!masked && 'branchName' in details && (
              <div>
                <dt className="text-muted-foreground">Branch</dt>
                <dd className="font-medium">{details.branchName ?? '—'}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">UPI ID</dt>
              <dd className="font-medium">{details.upiId ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Verification doc</dt>
              <dd className="font-medium">{details.hasVerificationDoc ? 'Uploaded' : 'Missing'}</dd>
            </div>
            {details.verifiedAt && (
              <div>
                <dt className="text-muted-foreground">Verified at</dt>
                <dd className="font-medium">{new Date(details.verifiedAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>

          {verificationNotes && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
              <span className="font-medium text-destructive">Notes: </span>
              {verificationNotes}
            </div>
          )}

          {canVerify && details.verificationStatus === 'pending' && (
            <div className="space-y-3 border-t pt-4">
              {showReject ? (
                <div className="space-y-2">
                  <Label htmlFor="reject-notes">Rejection notes</Label>
                  <Textarea
                    id="reject-notes"
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    rows={2}
                    placeholder="Reason for rejection (shared with user)"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={saving}
                      onClick={() => void handleVerify('rejected')}
                    >
                      Confirm reject
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowReject(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={saving} onClick={() => void handleVerify('verified')}>
                    Verify bank details
                  </Button>
                  <Button type="button" variant="outline" disabled={saving} onClick={() => setShowReject(true)}>
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
