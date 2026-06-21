import { useAuthStore } from '@/store';
import type { AppRole } from '@/types';
import { RoleSelectionModal } from '@/app/pages/auth/components/RoleSelectionModal';

interface RoleSelectionGateProps {
  onRoleSelected?: (role: AppRole) => void | Promise<void>;
}

export function RoleSelectionGate({ onRoleSelected }: RoleSelectionGateProps) {
  const requiresRoleSelection = useAuthStore((state) => state.requiresRoleSelection);
  const pendingUser = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const completeRoleSelection = useAuthStore((state) => state.completeRoleSelection);

  const handleSelect = async (role: AppRole) => {
    await completeRoleSelection(role);
    await onRoleSelected?.(role);
  };

  return (
    <RoleSelectionModal
      open={requiresRoleSelection}
      roles={pendingUser?.roles ?? []}
      isLoading={isLoading}
      onSelect={handleSelect}
    />
  );
}
