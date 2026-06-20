import { expect, test } from '@playwright/test';

const ADMIN = { email: 'admin@livotale.com', password: 'Admin@123' };

test.describe('S2 — Ops enquiry to order (PKG-1)', () => {
  test('admin can open enquiry detail and see CRM tabs', async ({ page }) => {
    const uniquePhone = `97${Date.now().toString().slice(-8)}`;

    await page.goto('/enquire');
    await page.locator('#page-name').fill('S2 Playwright Lead');
    await page.locator('#page-phone').fill(uniquePhone);
    await page.getByRole('button', { name: 'Submit enquiry' }).click();
    await expect(page).toHaveURL(/\/enquire\/thanks/, { timeout: 15_000 });

    await page.goto('/login');
    await page.getByLabel(/email|identifier/i).fill(ADMIN.email);
    await page.getByLabel(/password/i).fill(ADMIN.password);
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    await page.goto('/org/kolkata/admin/operations?tab=enquiries');
    await page.getByPlaceholder(/search/i).fill(uniquePhone);
    await page.getByRole('button', { name: /apply|search/i }).click();

    await expect(page.getByText('S2 Playwright Lead')).toBeVisible({ timeout: 15_000 });
    await page.getByText('S2 Playwright Lead').click();

    await expect(page.getByRole('tab', { name: 'Follow-up' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Create order' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Edit details' })).toBeVisible();
  });
});
