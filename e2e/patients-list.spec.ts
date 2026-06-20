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

test.describe('Patients list filters & pagination', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/org/kolkata/patients');
    await expect(page.getByRole('heading', { name: 'Patients', level: 2 })).toBeVisible({ timeout: 15_000 });
  });

  test('filters hidden by default, toggle shows filter panel', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Show filters' })).toBeVisible();
    await expect(page.locator('#patient-status')).not.toBeVisible();
    await page.getByRole('button', { name: 'Show filters' }).click();
    await expect(page.locator('#patient-status')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide filters' })).toBeVisible();
  });

  test('pagination controls render', async ({ page }) => {
    await expect(page.getByText(/Showing \d+–\d+ of \d+/)).toBeVisible();
    await expect(page.getByLabel('Previous page')).toBeVisible();
    await expect(page.getByLabel('Next page')).toBeVisible();
  });
});
