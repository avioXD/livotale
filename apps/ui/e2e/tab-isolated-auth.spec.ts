import { expect, test } from '@playwright/test';

async function loginAsRole(
  page: import('@playwright/test').Page,
  identifier: string,
  password: string,
  roleButton?: RegExp,
) {
  await page.goto('/org/login');
  await page.locator('#identifier').fill(identifier);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  const roleModal = page.getByRole('dialog');
  if (await roleModal.isVisible({ timeout: 3000 }).catch(() => false)) {
    if (!roleButton) throw new Error('Role selection required but no roleButton provided');
    await page.getByRole('button', { name: roleButton }).click();
  }

  await expect(page).toHaveURL(/\/org\/kolkata\/dashboard/, { timeout: 20_000 });
}

test.describe('Per-tab staff auth sessions', () => {
  test('two browser contexts stay authenticated independently', async ({ browser }) => {
    const adminContext = await browser.newContext();
    const techContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const techPage = await techContext.newPage();

    await loginAsRole(adminPage, 'admin@livotale.com', 'Admin@123');
    await loginAsRole(techPage, 'technician@livotale.com', 'Tech@123');

    await adminPage.goto('/org/kolkata/dashboard');
    await techPage.goto('/org/kolkata/technician/orders');

    await expect(adminPage.getByText('Super Admin')).toBeVisible({ timeout: 15_000 });
    await expect(techPage.getByRole('heading', { name: 'Field orders', level: 2 })).toBeVisible({
      timeout: 15_000,
    });

    await adminContext.close();
    await techContext.close();
  });
});
