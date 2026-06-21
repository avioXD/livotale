import { expect, test } from '@playwright/test';

test.describe('Super Admin shell smoke (S1)', () => {
  test('login and reach dashboard without fatal errors', async ({ page }) => {
    await page.goto('/org/login');

    await page.locator('#identifier').fill('admin@livotale.com');
    await page.locator('#password').fill('Admin@123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    const roleModal = page.getByRole('dialog');
    if (await roleModal.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.getByRole('button', { name: /super admin|admin/i }).first().click();
    }

    await expect(page).toHaveURL(/\/org\/kolkata\/dashboard/, { timeout: 20_000 });
  });
});
