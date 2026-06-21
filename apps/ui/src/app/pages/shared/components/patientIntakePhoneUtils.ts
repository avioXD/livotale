/** Last 10 digits for comparing Indian mobile numbers. */
export function phoneLast10(value: string): string {
  return value.replace(/\D/g, '').slice(-10);
}

/** True when intake phone must be OTP-verified before commit. */
export function intakePhoneNeedsOtp(
  intake: { phoneOtpVerified?: boolean; verifiedPhone?: string | null } | null,
  formPhone: string,
): boolean {
  if (!intake?.phoneOtpVerified) return true;
  const verified = intake.verifiedPhone ? phoneLast10(intake.verifiedPhone) : '';
  const current = phoneLast10(formPhone);
  return !verified || verified !== current;
}
