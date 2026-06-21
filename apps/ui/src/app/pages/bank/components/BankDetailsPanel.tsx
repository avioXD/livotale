import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { bankDetailsService } from '@/services/bank/BankDetailsService';
import { patientPortalService } from '@/services/liverCare';
import { storageService } from '@/services/storage/StorageService';
import { useAuthStore } from '@/store';
import {
  isBankDetailsConfigured,
  isBankProfileComplete,
  type BankDetailsFull,
  type BankVerificationStatus,
} from '@/types/bankDetails';

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_RE = /^[\w.\-]{2,256}@[\w]{2,64}$/;

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

interface BankDetailsPanelProps {
  mode: 'self' | 'patient';
  patientPhone?: string;
}

export function BankDetailsPanel({ mode, patientPhone }: BankDetailsPanelProps) {
  const userId = useAuthStore((state) => state.user?.id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [requiredForPayout, setRequiredForPayout] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<BankVerificationStatus>('pending');
  const [verificationNotes, setVerificationNotes] = useState<string | null>(null);
  const [hasVerificationDoc, setHasVerificationDoc] = useState(false);
  const [verificationDocFileId, setVerificationDocFileId] = useState<string | null>(null);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    upiId: '',
  });

  const applyDetails = (details: BankDetailsFull) => {
    setRequiredForPayout(details.requiredForPayout);
    setVerificationStatus(details.verificationStatus);
    setVerificationNotes(details.verificationNotes ?? null);
    setHasVerificationDoc(Boolean(details.hasVerificationDoc));
    setVerificationDocFileId(details.verificationDocFileId ?? null);
    setForm({
      accountHolderName: details.accountHolderName ?? '',
      accountNumber: details.accountNumber ?? '',
      ifscCode: details.ifscCode ?? '',
      bankName: details.bankName ?? '',
      branchName: details.branchName ?? '',
      upiId: details.upiId ?? '',
    });
  };

  const load = useCallback(async () => {
    if (mode === 'patient') {
      if (!patientPhone) return;
      setLoading(true);
      setError(null);
      try {
        const response = await patientPortalService.getBankDetails(patientPhone);
        if (!isBankDetailsConfigured(response)) {
          setRequiredForPayout(response.requiredForPayout ?? false);
          setVerificationStatus('pending');
          setVerificationNotes(null);
          setHasVerificationDoc(false);
          setVerificationDocFileId(null);
          setForm({
            accountHolderName: '',
            accountNumber: '',
            ifscCode: '',
            bankName: '',
            branchName: '',
            upiId: '',
          });
          return;
        }
        applyDetails(response.details);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load bank details');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode !== 'self') return;
    setLoading(true);
    setError(null);
    try {
      const response = await bankDetailsService.getMine();
      if (!isBankDetailsConfigured(response)) {
        setRequiredForPayout(response.requiredForPayout ?? false);
        setVerificationStatus('pending');
        setVerificationNotes(null);
        setHasVerificationDoc(false);
        setVerificationDocFileId(null);
        setForm({
          accountHolderName: '',
          accountNumber: '',
          ifscCode: '',
          bankName: '',
          branchName: '',
          upiId: '',
        });
        return;
      }

      applyDetails(response.details);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bank details');
    } finally {
      setLoading(false);
    }
  }, [mode, patientPhone]);

  useEffect(() => {
    void load();
  }, [load]);

  const isComplete = useMemo(
    () =>
      isBankProfileComplete({
        accountHolderName: form.accountHolderName,
        accountNumber: form.accountNumber,
        accountNumberLast4: form.accountNumber.slice(-4) || null,
        ifscCode: form.ifscCode,
        hasVerificationDoc: hasVerificationDoc || Boolean(verificationDocFileId),
        verificationStatus,
        requiredForPayout,
        userId: userId ?? patientPhone ?? '',
      }),
    [form, hasVerificationDoc, verificationDocFileId, verificationStatus, requiredForPayout, userId, patientPhone],
  );

  const validate = (): string | null => {
    const name = form.accountHolderName.trim();
    if (name.length < 2 || name.length > 160) {
      return 'Account holder name must be 2–160 characters.';
    }
    const digits = form.accountNumber.replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 18) {
      return 'Account number must be 9–18 digits.';
    }
    const ifsc = form.ifscCode.trim().toUpperCase();
    if (!IFSC_RE.test(ifsc)) {
      return 'Enter a valid IFSC code (e.g. HDFC0001234).';
    }
    const upi = form.upiId.trim();
    if (upi && !UPI_RE.test(upi)) {
      return 'Enter a valid UPI ID (name@bank).';
    }
    if (!verificationDocFileId && !hasVerificationDoc) {
      return 'Upload a cancelled cheque or bank proof document.';
    }
    return null;
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      if (mode === 'patient') {
        if (!patientPhone) {
          setError('Session expired. Sign in again.');
          return;
        }
        const uploaded = await patientPortalService.uploadVerificationDoc(patientPhone, file);
        setVerificationDocFileId(uploaded.fileId);
      } else {
        if (!userId) {
          setError('Sign in again to upload documents.');
          return;
        }
        const uploaded = await storageService.uploadFile(file, 'payout_verification', userId, 'cheque');
        setVerificationDocFileId(uploaded.fileId);
      }
      setHasVerificationDoc(true);
      setMessage('Verification document uploaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      accountHolderName: form.accountHolderName.trim(),
      accountNumber: form.accountNumber.replace(/\D/g, ''),
      ifscCode: form.ifscCode.trim().toUpperCase(),
      bankName: form.bankName.trim() || null,
      branchName: form.branchName.trim() || null,
      upiId: form.upiId.trim() || null,
      verificationDocFileId: verificationDocFileId ?? undefined,
    };

    setSaving(true);
    setError(null);
    try {
      const saved =
        mode === 'patient' && patientPhone
          ? await patientPortalService.upsertBankDetails(patientPhone, payload)
          : await bankDetailsService.upsertMine(payload);
      applyDetails(saved);
      setMessage(
        mode === 'patient'
          ? 'Bank details saved. We will verify them before processing any refund.'
          : 'Bank details saved. Verification is pending review.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'self' && !userId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Sign in to manage bank and payout details.
        </CardContent>
      </Card>
    );
  }

  if (mode === 'patient' && !patientPhone) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Sign in to manage refund bank details.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading bank details…</p>;
  }

  const title = mode === 'patient' ? 'Refund bank details' : 'Bank / payout details';
  const description =
    mode === 'patient'
      ? 'Add or update the account where refunds should be sent. Details are encrypted and verified by our team.'
      : 'Used for reimbursements and payouts. Account numbers are encrypted and verified by admin.';
  const requiredBanner =
    mode === 'patient'
      ? 'Bank details are required before refunds can be processed. Complete all fields and upload verification proof.'
      : 'Bank details are required before payouts can be processed. Complete all fields and upload verification proof.';

  return (
    <div className="space-y-4">
      {requiredForPayout && !isComplete && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {requiredBanner}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}
      {message && (
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-200">
          {message}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant={verificationBadgeVariant(verificationStatus)} className="capitalize">
            {verificationStatus}
          </Badge>
        </CardHeader>
        <CardContent>
          {verificationStatus === 'rejected' && verificationNotes && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
              <span className="font-medium text-destructive">Rejection notes: </span>
              {verificationNotes}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="accountHolderName">Account holder name</Label>
              <Input
                id="accountHolderName"
                value={form.accountHolderName}
                onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account number</Label>
              <div className="relative">
                <Input
                  id="accountNumber"
                  type={showAccountNumber ? 'text' : 'password'}
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowAccountNumber((v) => !v)}
                  aria-label={showAccountNumber ? 'Hide account number' : 'Show account number'}
                >
                  {showAccountNumber ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ifscCode">IFSC code</Label>
              <Input
                id="ifscCode"
                value={form.ifscCode}
                onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
                placeholder="HDFC0001234"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankName">Bank name</Label>
              <Input
                id="bankName"
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchName">Branch name</Label>
              <Input
                id="branchName"
                value={form.branchName}
                onChange={(e) => setForm({ ...form, branchName: e.target.value })}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="upiId">UPI ID (optional)</Label>
              <Input
                id="upiId"
                value={form.upiId}
                onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                placeholder="name@bank"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Verification document</Label>
              <p className="text-xs text-muted-foreground">
                Upload a cancelled cheque or bank statement (PDF, JPG, or PNG).
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className="max-w-sm"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(file);
                    e.target.value = '';
                  }}
                />
                {(hasVerificationDoc || verificationDocFileId) && (
                  <Badge variant="outline">Document uploaded</Badge>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving || uploading}>
                {saving ? 'Saving…' : 'Save bank details'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
