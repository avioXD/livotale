import { Badge } from '@/components/ui/badge';
import { getConsentStatusVariant } from '@/utils/statusColors';
import { Button } from '@/components/ui/button';
import type { UserConsent } from '@/types';

interface ProfileConsentSectionProps {
  consents: UserConsent[];
  isLoading?: boolean;
  acceptingPurposeId?: string | null;
  onAccept: (consent: UserConsent) => Promise<void>;
}

export function ProfileConsentSection({
  consents,
  isLoading = false,
  acceptingPurposeId = null,
  onAccept,
}: ProfileConsentSectionProps) {
  if (consents.length === 0) {
    return <p className="text-sm text-muted-foreground">No consent records yet.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Accepting a purpose records your consent in Livotale&apos;s audit database via the API.
      </p>
      {consents.map((consent) => {
        const isAccepting = acceptingPurposeId === consent.purposeId;
        return (
          <div key={consent.purposeId} className="rounded-lg border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="font-medium">{consent.purposeName}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {consent.purposeCode}
                </p>
                {consent.purposeDescription && (
                  <p className="text-sm text-muted-foreground">{consent.purposeDescription}</p>
                )}
                {consent.accepted && consent.acceptedAt && (
                  <p className="text-xs text-muted-foreground">
                    Accepted {new Date(consent.acceptedAt).toLocaleString()}
                  </p>
                )}
              </div>
              {consent.accepted ? (
                <Badge variant={getConsentStatusVariant(true)} className="self-start">
                  Accepted
                </Badge>
              ) : (
                <Button
                  size="sm"
                  className="self-start"
                  disabled={isLoading || isAccepting}
                  onClick={() => void onAccept(consent)}
                >
                  {isAccepting ? 'Saving…' : 'Accept'}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
