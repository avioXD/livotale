import { expect, test } from '@playwright/test';

async function loginAsSuperAdmin(page: import('@playwright/test').Page) {
  await page.goto('/org/login');
  await page.locator('#identifier').fill('admin@livotale.com');
  await page.locator('#password').fill('Admin@123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  const roleModal = page.getByRole('dialog');
  if (await roleModal.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.getByRole('button', { name: /super admin|admin/i }).first().click();
  }

  await expect(page).toHaveURL(/\/org\/kolkata\/dashboard/, { timeout: 20_000 });
}

test.describe('Login logs (Security tab + admin)', () => {
  test('settings security tab shows recent login activity with valid data', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/org/kolkata/settings?tab=security');

    await expect(page.getByRole('heading', { name: 'Recent login activity' })).toBeVisible();
    await expect(page.getByText('No login logs available.')).not.toBeVisible({ timeout: 10_000 });

    const activityCard = page.locator('section').filter({ hasText: 'Recent login activity' }).locator('.rounded-lg.border').first();
    await expect(activityCard).toBeVisible();
    await expect(activityCard.getByText('Password')).toBeVisible();
    await expect(activityCard.getByText('Success')).toBeVisible();
    await expect(activityCard.getByText('Invalid Date')).not.toBeVisible();
  });

  test('admin login logs page renders org-wide table', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/org/kolkata/admin/login-logs');

    await expect(page.getByRole('heading', { name: 'Login activity' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'User' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Failure reason' })).toBeVisible();

    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });
    await expect(firstRow.getByText('Success').or(firstRow.getByText('Failed'))).toBeVisible();
  });
});
