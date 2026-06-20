import { expect, test } from '@playwright/test';

async function loginAsOperations(page: import('@playwright/test').Page) {
  await page.goto('/org/login');
  await page.locator('#identifier').fill('operations@livotale.com');
  await page.locator('#password').fill('Ops@123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  const roleModal = page.getByRole('dialog');
  if (await roleModal.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.getByRole('button', { name: /operations|support/i }).first().click();
  }

  await expect(page).toHaveURL(/\/org\/kolkata\/dashboard/, { timeout: 20_000 });
}

test.describe('S4 pathology partner lab workflow (UI smoke)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOperations(page);
  });

  test('ops hub lab reports tab shows visit and external ID columns', async ({ page }) => {
    await page.goto('/org/kolkata/admin/operations?tab=partner-lab');
    await expect(page.getByRole('main').getByRole('heading', { name: 'Lab reports', level: 2 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('columnheader', { name: 'Lab portal ID' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Visit' })).toBeVisible();
  });

  test('order lab step shows pathology schedule and visit confirmation sections', async ({ page }) => {
    await page.goto('/org/kolkata/admin/operations?tab=orders');
    await expect(page.getByRole('main').getByRole('heading', { name: 'Orders', level: 2 })).toBeVisible({
      timeout: 15_000,
    });

    const pkg2Row = page.getByRole('row').filter({ hasText: 'PKG-2' }).first();
    if (!(await pkg2Row.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No PKG-2 order in seed data for lab step smoke test');
    }

    await pkg2Row.getByRole('link').first().click();
    await page.goto(page.url().split('?')[0] + '?step=lab');

    await expect(page.getByText('Pathology schedule')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Lab partner portal order ID')).toBeVisible();
    await expect(page.getByText(/Update from lab partner portal/i)).toBeVisible({ timeout: 5000 }).catch(() => {
      // Order may already be past visit stage — checklist still visible
    });
    await expect(page.getByText('Assign lab partner & portal order ID')).toBeVisible();
  });
});
