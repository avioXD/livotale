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

const DIRECTORY_PAGES = [
  { path: '/org/kolkata/admin/audit', heading: 'Audit log' },
  { path: '/org/kolkata/admin/bank-details', heading: 'Bank details directory' },
  { path: '/org/kolkata/admin/packages', heading: 'Packages' },
  { path: '/org/kolkata/admin/staff/lab-partners', heading: 'Partner labs' },
  { path: '/org/kolkata/admin/service-zones', heading: 'Service zones' },
] as const;

test.describe('Admin directory tables', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  for (const entry of DIRECTORY_PAGES) {
    test(`${entry.heading} loads with pagination`, async ({ page }) => {
      await page.goto(entry.path);
      await expect(page.getByRole('heading', { name: entry.heading, level: 2 })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByText(/Showing \d+–\d+ of \d+/)).toBeVisible({ timeout: 10_000 });
    });
  }
});
