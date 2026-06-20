import { useCallback, useEffect, useState } from 'react';
import { FiArchive, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { canArchiveStaff } from '@/app/config/productRoles';
import { ConfirmModal } from '@/components/common';
import { staffDirectoryService } from '@/services/staff/StaffDirectoryService';
import { useUserRole } from '@/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StaffArchiveEligibility, StaffMemberRow, StaffRoleKey } from '@/types/staffHub';

interface StaffArchivePanelProps {
  roleKey: StaffRoleKey;
  member: StaffMemberRow;
  onArchived: () => void;
}

export function StaffArchivePanel({ roleKey, member, onArchived }: StaffArchivePanelProps) {
  const userRole = useUserRole();
  const canArchive = canArchiveStaff(userRole);
  const [eligibility, setEligibility] = useState<StaffArchiveEligibility | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isUnarchiving, setIsUnarchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unarchiveConfirmOpen, setUnarchiveConfirmOpen] = useState(false);

  const loadEligibility = useCallback(async () => {
    if (!canArchive || member.status === 'archived') return;
    setIsChecking(true);
    setError(null);
    try {
      setEligibility(await staffDirectoryService.checkArchiveEligibility(roleKey, member.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check archive eligibility');
      setEligibility(null);
    } finally {
      setIsChecking(false);
    }
  }, [canArchive, member.id, member.status, roleKey]);

  useEffect(() => {
    void loadEligibility();
  }, [loadEligibility]);

  if (!canArchive) {
    return null;
  }

  const handleArchive = async () => {
    setIsArchiving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await staffDirectoryService.archiveMember(roleKey, member.id);
      setSuccess(result.message);
      setConfirmOpen(false);
      onArchived();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
      await loadEligibility();
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchive = async () => {
    setIsUnarchiving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await staffDirectoryService.unarchiveMember(roleKey, member.id);
      setSuccess(result.message);
      setUnarchiveConfirmOpen(false);
      onArchived();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unarchive failed');
    } finally {
      setIsUnarchiving(false);
    }
  };

  if (member.status === 'archived') {
    return (
      <>
        <Card className="border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FiArchive className="h-4 w-4" />
              Archived user
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              This account is archived and cannot sign in. Historical records are retained.
            </p>
            {member.archivedAt && (
              <p>
                <span className="text-muted-foreground">Archived at: </span>
                {new Date(member.archivedAt).toLocaleString()}
              </p>
            )}

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                {success}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              disabled={isUnarchiving}
              onClick={() => setUnarchiveConfirmOpen(true)}
            >
              Unarchive {member.fullName}
            </Button>
          </CardContent>
        </Card>

        <ConfirmModal
          open={unarchiveConfirmOpen}
          title="Confirm unarchive"
          description={`Restore ${member.fullName}? They will be set to inactive and can be reactivated from their profile.`}
          confirmLabel="Unarchive user"
          isConfirming={isUnarchiving}
          onConfirm={() => void handleUnarchive()}
          onCancel={() => setUnarchiveConfirmOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <Card className="border-destructive/20">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FiArchive className="h-4 w-4" />
                Archive user
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Archive only when the user has no active assignments across the platform.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isChecking}
              onClick={() => void loadEligibility()}
            >
              {isChecking ? 'Checking…' : 'Recheck assignments'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              {success}
            </div>
          )}

          {isChecking && !eligibility && (
            <p className="text-sm text-muted-foreground">Scanning active assignments…</p>
          )}

          {eligibility && (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                {eligibility.canArchive ? (
                  <FiCheckCircle className="mt-0.5 h-4 w-4 text-emerald-600" />
                ) : (
                  <FiAlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                )}
                <div>
                  <p className="text-sm font-medium">{eligibility.message}</p>
                  {!eligibility.canArchive && eligibility.blockers.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {eligibility.blockers.map((blocker) => (
                        <li key={blocker.category} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="secondary">{blocker.count}</Badge>
                          <span>{blocker.message}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="destructive"
                disabled={!eligibility.canArchive || isArchiving}
                onClick={() => setConfirmOpen(true)}
              >
                Archive {member.fullName}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmModal
        open={confirmOpen}
        title="Confirm archive"
        description={`Archive ${member.fullName}? They will lose access immediately. You can unarchive them later if needed.`}
        confirmLabel="Archive user"
        confirmVariant="destructive"
        isConfirming={isArchiving}
        onConfirm={() => void handleArchive()}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
