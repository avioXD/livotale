import { expect, test } from '@playwright/test';

test.describe('Public enquiry form', () => {
  test('submit on /enquire redirects to thank-you with enquiry number', async ({ page }) => {
    const uniquePhone = `98${Date.now().toString().slice(-8)}`;

    await page.goto('/enquire');
    await expect(page.getByRole('heading', { name: /Enquire about Liver Fibrosis Scan/i })).toBeVisible();

    await page.locator('#page-name').fill('E2E Test Lead');
    await page.locator('#page-phone').fill(uniquePhone);
    await page.getByRole('button', { name: 'Submit enquiry' }).click();

    await expect(page).toHaveURL(/\/enquire\/thanks/, { timeout: 15_000 });
    await expect(page.getByText(/enquiry|reference|thank/i)).toBeVisible();
  });
});
