import { FiX } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/rbac';
import type { AppRole } from '@/types';

interface RoleSelectionModalProps {
  open: boolean;
  roles: AppRole[];
  isLoading?: boolean;
  onSelect: (role: AppRole) => void | Promise<void>;
  onClose?: () => void;
}

export function RoleSelectionModal({
  open,
  roles,
  isLoading = false,
  onSelect,
  onClose,
}: RoleSelectionModalProps) {
  if (!open || roles.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl border bg-background shadow-xl" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Choose your role</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your account has multiple roles. Select how you want to sign in.
            </p>
          </div>
          {onClose && (
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <FiX className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="space-y-2 p-5">
          {roles.map((role) => (
            <Button
              key={role}
              type="button"
              variant="outline"
              className="h-auto w-full justify-start px-4 py-3 text-left"
              disabled={isLoading}
              onClick={() => void onSelect(role)}
            >
              <span className="font-medium">{ROLE_LABELS[role]}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
