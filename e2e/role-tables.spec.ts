import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page, identifier: string, password: string) {
  await page.goto('/org/login');
  await page.locator('#identifier').fill(identifier);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/org\/kolkata\/dashboard/, { timeout: 20_000 });
}

test.describe('Role table views', () => {
  test('technician orders table has filter toggle and pagination', async ({ page }) => {
    await login(page, 'technician@livotale.com', 'Tech@123');
    await page.goto('/org/kolkata/technician/orders');
    await expect(page.getByRole('heading', { name: /field orders|orders/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Show filters' })).toBeVisible();
    await expect(page.getByText(/Showing \d+–\d+ of \d+/)).toBeVisible();
  });

  test('doctor consultations table has filter toggle', async ({ page }) => {
    await login(page, 'doctor@livotale.com', 'Doctor@123');
    await page.goto('/org/kolkata/doctor/consultations');
    await expect(page.getByRole('heading', { name: /consultations/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Show filters' })).toBeVisible();
  });
});
