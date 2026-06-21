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

test.describe('URL-routed tabs (Phase I)', () => {
  test('settings security tab loads via ?tab=security', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/org/kolkata/settings?tab=security');
    await expect(page.getByRole('tab', { name: 'Security' })).toHaveAttribute('data-state', 'active');
    await expect(page.getByRole('heading', { name: 'Active sessions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent login activity' })).toBeVisible();
  });

  test('operations enquiries tab loads via ?tab=enquiries', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/org/kolkata/admin/operations?tab=enquiries');
    await expect(page.getByRole('heading', { name: 'Enquiries' })).toBeVisible();
  });

  test('settings profile section loads via ?profileSection=legal', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/org/kolkata/settings?tab=my-profile&profileSection=legal');
    await expect(page.getByRole('tab', { name: 'Legal docs' })).toHaveAttribute('data-state', 'active');
  });
});
