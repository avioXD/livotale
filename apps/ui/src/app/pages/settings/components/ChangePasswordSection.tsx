import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ORG_LOGIN_PATH } from '@/app/config/orgRoutes';
import { authService } from '@/services';
import { useAuthStore } from '@/store';

const PASSWORD_HINT =
  'At least 8 characters with uppercase, lowercase, a number, and a special character.';

export function ChangePasswordSection() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      await logout();
      navigate(`${ORG_LOGIN_PATH}?reason=password-changed`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="max-w-md space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="font-medium">Change password</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          You will be signed out on all devices after updating your password.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
        />
        <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Updating…' : 'Update password & sign out'}
      </Button>
    </form>
  );
}
