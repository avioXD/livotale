import { expect, test } from '@playwright/test';

const DEMO_OTP = '123456';
const SEED_PHONE = '9900000001';

async function loginAsPatient(page: import('@playwright/test').Page) {
  await page.goto('/patient/login');
  await page.getByLabel(/phone number/i).fill(SEED_PHONE);
  await page.getByRole('button', { name: /^send otp$/i }).click();
  await expect(page.getByLabel(/enter otp/i)).toBeVisible({ timeout: 15_000 });
  await page.getByLabel(/enter otp/i).fill(DEMO_OTP);
  await page.getByRole('button', { name: /^login$/i }).click();
  await expect(page).toHaveURL(/\/patient(?:\/|$)/, { timeout: 20_000 });
}

test.describe('S6 — Patient portal', () => {
  test('patient portal login page loads', async ({ page }) => {
    await page.goto('/patient/login');
    await expect(page.getByRole('heading', { name: /sign in|patient portal/i })).toBeVisible();
    await expect(page.getByLabel(/phone number/i)).toBeVisible();
  });

  test('OTP send, wrong code error, and successful login', async ({ page }) => {
    await page.goto('/patient/login');

    await page.getByLabel(/phone number/i).fill(SEED_PHONE);
    await page.getByRole('button', { name: /^send otp$/i }).click();

    await expect(page.getByLabel(/enter otp/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/demo code:\s*123456/i)).toBeVisible();

    await page.getByLabel(/enter otp/i).fill('000000');
    await page.getByRole('button', { name: /^login$/i }).click();
    await expect(page.getByText(/invalid otp|verification failed/i)).toBeVisible({ timeout: 10_000 });

    await page.getByLabel(/enter otp/i).fill(DEMO_OTP);
    await page.getByRole('button', { name: /^login$/i }).click();
    await expect(page).toHaveURL(/\/patient(?:\/|$)/, { timeout: 20_000 });
  });

  test('resend OTP button visible after send', async ({ page }) => {
    await page.goto('/patient/login');

    await page.getByLabel(/phone number/i).fill(SEED_PHONE);
    await page.getByRole('button', { name: /^send otp$/i }).click();
    await expect(page.getByLabel(/enter otp/i)).toBeVisible({ timeout: 15_000 });

    const resend = page.getByRole('button', { name: /resend otp|resend in \d+s/i });
    await expect(resend).toBeVisible();
    // Demo otp_mode skips rate limits — resend is immediate; live mode shows countdown.
    const label = await resend.textContent();
    if (label?.match(/resend in \d+s/i)) {
      await expect(resend).toBeDisabled();
    } else {
      await expect(resend).toBeEnabled();
    }
  });
});

test.describe('S6 — Patient portal mobile nav', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('bottom nav navigates to orders and profile', async ({ page }) => {
    await loginAsPatient(page);

    await expect(page.getByRole('navigation', { name: /mobile navigation/i })).toBeVisible();
    await page.getByRole('link', { name: /^orders$/i }).click();
    await expect(page).toHaveURL(/\/patient\/orders$/);
    await expect(page.getByRole('heading', { name: /my orders/i })).toBeVisible();

    await page.getByRole('link', { name: /^profile$/i }).click();
    await expect(page).toHaveURL(/\/patient\/profile$/);
  });

  test('hamburger menu opens downloads link', async ({ page }) => {
    await loginAsPatient(page);

    await page.getByRole('button', { name: /open menu/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('link', { name: /^downloads$/i }).click();
    await expect(page).toHaveURL(/\/patient\/downloads$/);
    await expect(page.getByRole('heading', { name: /download center/i })).toBeVisible();
  });
});
