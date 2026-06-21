import { expect, test } from '@playwright/test';

async function loginAsOperations(page: import('@playwright/test').Page) {
  await page.goto('/org/login');
  await page.locator('#identifier').fill('operations@livotale.com');
  await page.locator('#password').fill('Ops@123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  const roleModal = page.getByRole('dialog');
  if (await roleModal.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.getByRole('button', { name: /operations|ops/i }).first().click();
  }

  await expect(page).toHaveURL(/\/org\/kolkata\//, { timeout: 20_000 });
}

test.describe('Staff assignment notifications', () => {
  test('operations notifications inbox page loads', async ({ page }) => {
    await loginAsOperations(page);
    await page.goto('/org/kolkata/notifications');
    await expect(page.getByRole('heading', { name: 'Notifications', level: 2 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Actions on orders and enquiries|No notifications yet/)).toBeVisible();
  });
});
