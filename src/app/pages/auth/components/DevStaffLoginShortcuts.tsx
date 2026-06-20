import { Button } from '@/components/ui/button';
import {
  DEV_STAFF_LOGIN_SHORTCUTS,
  type DevStaffLoginShortcut,
} from '@/app/pages/auth/devStaffLoginShortcuts';

interface DevStaffLoginShortcutsProps {
  readonly disabled?: boolean;
  readonly onSelect: (shortcut: DevStaffLoginShortcut) => void;
}

export function DevStaffLoginShortcuts({ disabled, onSelect }: DevStaffLoginShortcutsProps) {
  if (DEV_STAFF_LOGIN_SHORTCUTS.length === 0) return null;

  return (
    <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-3">
      <p className="text-xs font-medium text-amber-900 dark:text-amber-100">Dev mode — quick sign-in</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Bootstrap accounts from local seed data.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {DEV_STAFF_LOGIN_SHORTCUTS.map((shortcut) => (
          <Button
            key={shortcut.label}
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => onSelect(shortcut)}
          >
            {shortcut.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
