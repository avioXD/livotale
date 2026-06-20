export type BankVerificationStatus = 'pending' | 'verified' | 'rejected';

export interface BankDetailsMasked {
  userId: string;
  accountHolderName: string | null;
  accountNumberLast4: string | null;
  ifscCode: string | null;
  bankName?: string | null;
  branchName?: string | null;
  upiId?: string | null;
  verificationStatus: BankVerificationStatus;
  hasVerificationDoc?: boolean;
  requiredForPayout: boolean;
  verifiedAt?: string | null;
}

export interface BankDetailsFull extends BankDetailsMasked {
  accountNumber?: string | null;
  verificationDocFileId?: string | null;
  verificationNotes?: string | null;
}

export interface UpsertBankDetailsInput {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName?: string | null;
  branchName?: string | null;
  upiId?: string | null;
  verificationDocFileId?: string | null;
}

export interface BankDetailsNotConfigured {
  configured: false;
  requiredForPayout?: boolean;
}

export interface BankDetailsConfigured {
  configured: true;
  details: BankDetailsFull;
}

export type BankDetailsSelfResponse = BankDetailsNotConfigured | BankDetailsConfigured;

export interface BankDetailsDirectoryRow {
  userId: string;
  fullName: string;
  email: string | null;
  mobile?: string | null;
  role: string;
  staffMemberId?: string | null;
  staffRoleSlug?: string | null;
  accountHolderName: string | null;
  accountNumberLast4: string | null;
  ifscCode: string | null;
  bankName: string | null;
  verificationStatus: BankVerificationStatus | null;
  requiredForPayout: boolean;
  hasVerificationDoc: boolean;
  configured: boolean;
}

export interface BankDetailsDirectoryFilters {
  status?: BankVerificationStatus;
  q?: string;
  role?: string;
}

export function isBankDetailsConfigured(
  response: BankDetailsSelfResponse,
): response is BankDetailsConfigured {
  return response.configured === true;
}

export function isBankProfileComplete(details: BankDetailsFull): boolean {
  return Boolean(
    details.accountHolderName?.trim()
      && (details.accountNumber?.trim() || details.accountNumberLast4)
      && details.ifscCode?.trim()
      && details.hasVerificationDoc,
  );
}
