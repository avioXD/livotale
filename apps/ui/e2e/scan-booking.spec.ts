import { test, expect } from '@playwright/test';

/**
 * Scan booking: patient preference + ops confirm (requires running API + seeded admin).
 * Skips when admin login is unavailable.
 */
test.describe('Scan booking flow', () => {
  test.skip(true, 'Enable when E2E stack is up with PKG-1 order in payment_completed state');

  test('ops order scan step exposes confirm schedule', async ({ page }) => {
    await page.goto('/org/default/admin/orders');
    await expect(page.getByText('Home visit schedule')).toBeVisible();
  });
});
