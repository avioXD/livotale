import { expect, test } from '@playwright/test';

async function login(
  page: import('@playwright/test').Page,
  identifier: string,
  password: string,
  rolePattern?: RegExp,
) {
  await page.goto('/org/login');
  await page.locator('#identifier').fill(identifier);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  const roleModal = page.getByRole('dialog');
  if (rolePattern && (await roleModal.isVisible({ timeout: 5000 }).catch(() => false))) {
    await roleModal.getByRole('button', { name: rolePattern }).first().click();
  }

  await expect(page).toHaveURL(/\/org\/kolkata\/dashboard/, { timeout: 20_000 });
}

test.describe('Admin dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@livotale.com', 'Admin@123', /super admin|admin/i);
  });

  test('loads liver care KPIs and global report', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
    await expect(page.getByText('Global report')).toBeVisible();
    await expect(page.getByText('Enquiries')).toBeVisible();
    await expect(page.getByText('Revenue (filtered)')).toBeVisible();
  });

  test('package filter is available', async ({ page }) => {
    await expect(page.locator('#pkg-filter')).toBeVisible();
  });
});

test.describe('Operations dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/org/login');
    await page.getByRole('button', { name: 'Operations', exact: true }).click();
    await expect(page).toHaveURL(/\/org\/kolkata\/dashboard/, { timeout: 20_000 });
  });

  test('loads ops panel and global report', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Operations dashboard' })).toBeVisible();
    await expect(page.getByText('Global report')).toBeVisible();
    await expect(page.getByText('New enquiries')).toBeVisible();
  });
});

test.describe('Technician dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'technician@livotale.com', 'Tech@123', /technician/i);
  });

  test('shows field dashboard without global report', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Field dashboard' })).toBeVisible();
    await expect(page.getByText('Global report')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Pending scan visits' })).toBeVisible();
  });
});

test.describe('Doctor dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'doctor@livotale.com', 'Doctor@123', /doctor/i);
  });

  test('shows clinical dashboard without global report', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Clinical dashboard' })).toBeVisible();
    await expect(page.getByText('Global report')).toHaveCount(0);
    await expect(page.getByText('Consultation queue')).toBeVisible();
  });
});
