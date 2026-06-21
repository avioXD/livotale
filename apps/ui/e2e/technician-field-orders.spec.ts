import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_REPORT = path.join(__dirname, 'fixtures', 'sample-fibroscan-report.pdf');

async function loginAsTechnician(page: import('@playwright/test').Page) {
  await page.goto('/org/login');
  await page.locator('#identifier').fill('technician@livotale.com');
  await page.locator('#password').fill('Tech@123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  const roleModal = page.getByRole('dialog');
  if (await roleModal.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.getByRole('button', { name: /technician/i }).first().click();
  }

  await expect(page).toHaveURL(/\/org\/kolkata\/dashboard/, { timeout: 20_000 });
}

async function advanceVisitToIntakeOtp(page: import('@playwright/test').Page) {
  await page.goto('/org/kolkata/technician/orders');
  const firstRow = page.locator('table tbody tr').first();
  if (!(await firstRow.isVisible({ timeout: 5000 }).catch(() => false))) {
    return false;
  }

  await firstRow.click();
  await expect(page.getByText('1. Patient details intake')).toBeVisible({ timeout: 15_000 });

  const startVisit = page.getByRole('button', { name: /start visit/i });
  if (await startVisit.isVisible({ timeout: 3000 }).catch(() => false)) {
    await startVisit.click();
  }

  const reached = page.getByRole('button', { name: /reached|at location/i });
  if (await reached.isVisible({ timeout: 5000 }).catch(() => false)) {
    await reached.click();
  }

  const sendOtp = page.getByRole('button', { name: /send otp to/i });
  if (!(await sendOtp.isVisible({ timeout: 5000 }).catch(() => false))) {
    return false;
  }

  await sendOtp.click();
  await expect(page.getByLabel(/enter otp/i)).toBeVisible({ timeout: 10_000 });

  await page.getByLabel(/enter otp/i).fill('123456');
  await page.getByRole('button', { name: /submit patient intake/i }).click();
  await expect(page.getByText(/verified|continue to fibroscan intake/i)).toBeVisible({
    timeout: 20_000,
  });
  return true;
}

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

test.describe('Technician field orders', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTechnician(page);
  });

  test('field orders list loads without blood sample UI', async ({ page }) => {
    await page.goto('/org/kolkata/technician/orders');
    await expect(page.getByRole('heading', { name: 'Field orders', level: 2 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Samples to send to lab')).toHaveCount(0);
    await expect(page.getByText(/blood sample/i)).toHaveCount(0);
    await expect(page.getByRole('tab', { name: /Pending scan/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('tab', { name: /Completed scans/i })).toBeVisible();
  });

  test('dashboard shows scan-only KPIs', async ({ page }) => {
    await page.goto('/org/kolkata/dashboard');
    await expect(page.getByText('Samples to send to lab')).toHaveCount(0);
    await expect(page.getByText('Pending scan')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Completed scans')).toBeVisible();
  });

  test('open first assigned order shows patient and visit workflow', async ({ page }) => {
    await page.goto('/org/kolkata/technician/orders');
    await expect(page.getByRole('heading', { name: 'Field orders', level: 2 })).toBeVisible({
      timeout: 15_000,
    });

    const firstRow = page.locator('table tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No assigned orders for technician in test environment');
    }

    await firstRow.click();
    await expect(page.getByText('Patient & visit')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('1. Patient details intake')).toBeVisible();
    await expect(page.getByText(/blood sample/i)).toHaveCount(0);
    await expect(page.getByText('Order ID')).toBeVisible();
    await expect(page.getByText('Basic details')).toBeVisible();
    await expect(page.getByText('Comorbidities')).toBeVisible();
  });

  test('patient intake OTP send and verify when visit is at location', async ({ page }) => {
    const ready = await advanceVisitToIntakeOtp(page);
    if (!ready) {
      test.skip(true, 'No assigned orders or order not ready for intake OTP');
    }
  });

  test('fibroscan intake submit after patient OTP verify', async ({ page }) => {
    const ready = await advanceVisitToIntakeOtp(page);
    if (!ready) {
      test.skip(true, 'No assigned orders or order not ready for fibroscan intake');
    }

    await expect(page.getByText('2. FibroScan intake')).toBeVisible({ timeout: 15_000 });
    await page.getByLabel('Device patient code').fill('E2E-FS-001');
    await page.getByRole('button', { name: /submit fibroscan intake/i }).click();
    await expect(page.getByText('Submitted to operations')).toBeVisible({ timeout: 20_000 });
  });

  test('scan report upload submit after fibroscan intake', async ({ page }) => {
    const ready = await advanceVisitToIntakeOtp(page);
    if (!ready) {
      test.skip(true, 'No assigned orders or order not ready for scan upload');
    }

    await expect(page.getByText('2. FibroScan intake')).toBeVisible({ timeout: 15_000 });
    await page.getByLabel('Device patient code').fill('E2E-FS-UPLOAD');
    await page.getByRole('button', { name: /submit fibroscan intake/i }).click();
    await expect(page.getByText('Submitted to operations')).toBeVisible({ timeout: 20_000 });

    await expect(page.getByText('3. FibroScan results from machine')).toBeVisible({ timeout: 15_000 });
    await page.getByPlaceholder('e.g. 6.2').fill('6.2');
    await page.getByPlaceholder('e.g. 285').fill('250');
    await page.locator('input[inputmode="decimal"]').nth(2).fill('0.8');
    await page.locator('input[inputmode="decimal"]').nth(3).fill('12');
    await page.locator('input[inputmode="numeric"]').first().fill('10');
    await page.locator('input[inputmode="numeric"]').nth(1).fill('10');

    await page.locator('#scan-proof-file').setInputFiles(SAMPLE_REPORT);
    await page.getByRole('button', { name: /submit scan/i }).click();

    await expect(page.getByText('3. FibroScan results')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('link', { name: /view report proof/i })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Admin fibroscan intake validation', () => {
  test('ops validates technician fibroscan intake on scan step', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/org/kolkata/admin/operations?tab=orders');
    await expect(page.getByRole('main').getByRole('heading', { name: 'Orders', level: 2 })).toBeVisible({
      timeout: 15_000,
    });

    const firstRow = page.locator('table tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No orders in test environment');
    }

    await firstRow.click();
    await page.goto(`${page.url().split('?')[0]}?step=scan`, { waitUntil: 'networkidle' });

    const validateButton = page.getByRole('button', { name: /validate fibroscan intake/i });
    if (!(await validateButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No pending FibroScan intake submission on this order');
    }

    await page.getByPlaceholder(/optional notes for approval or rejection reason/i).fill('E2E validation');
    await validateButton.click();
    await expect(validateButton).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(/E2E validation/)).toBeVisible({ timeout: 10_000 });
  });
});
