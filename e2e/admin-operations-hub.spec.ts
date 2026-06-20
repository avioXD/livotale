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

async function expectOpsHeading(page: import('@playwright/test').Page, name: string) {
  await expect(page.getByRole('main').getByRole('heading', { name, level: 2 })).toBeVisible({ timeout: 15_000 });
}

async function clickOpsNavLink(page: import('@playwright/test').Page, label: string) {
  await page.getByRole('navigation').getByRole('link', { name: label, exact: true }).click();
}
const OPS_TABS = [
  { path: '/org/kolkata/admin/operations', heading: 'Overview' },
  { path: '/org/kolkata/admin/operations?tab=enquiries', heading: 'Enquiries' },
  { path: '/org/kolkata/admin/operations?tab=orders', heading: 'Orders' },
  { path: '/org/kolkata/admin/operations?tab=partner-lab', heading: 'Lab reports' },
  { path: '/org/kolkata/admin/operations?tab=appointments', heading: 'Appointments' },
  { path: '/org/kolkata/admin/operations?tab=ai-review', heading: 'AI review' },
] as const;

test.describe('Admin operations hub', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  for (const tab of OPS_TABS) {
    test(`tab route loads: ${tab.heading}`, async ({ page }) => {
      await page.goto(tab.path);
      await expectOpsHeading(page, tab.heading);
    });
  }

  test('sidebar operations sub-links navigate correctly', async ({ page }) => {
    await page.goto('/org/kolkata/admin/operations');

    const sidebarLinks = [
      { label: 'Overview', heading: 'Overview' },
      { label: 'Enquiries', heading: 'Enquiries' },
      { label: 'Orders', heading: 'Orders' },
      { label: 'Lab reports', heading: 'Lab reports' },
      { label: 'Appointments', heading: 'Appointments' },
      { label: 'AI review', heading: 'AI review' },
    ];

    for (const link of sidebarLinks) {
      await clickOpsNavLink(page, link.label);
      await expectOpsHeading(page, link.heading);
    }
  });

  test('overview quick actions navigate correctly', async ({ page }) => {
    await page.goto('/org/kolkata/admin/operations');
    await expectOpsHeading(page, 'Overview');

    await page.getByRole('link', { name: 'Book walk-in' }).click();
    await expect(page).toHaveURL(/\/admin\/appointments\/book/);
    await expect(page.getByRole('heading', { name: 'Book walk-in appointment', level: 2 })).toBeVisible();

    await page.goto('/org/kolkata/admin/operations');
    await page.getByRole('button', { name: 'Pending payments' }).click();
    await expect(page).toHaveURL(/tab=orders/);
    await expect(page).toHaveURL(/paymentStatus=link_sent/);
    await expectOpsHeading(page, 'Orders');
    await expect(page.getByTestId('active-filter-banner')).toBeVisible();
    await expect(page.getByTestId('active-filter-banner')).toContainText('Link sent');

    await page.goto('/org/kolkata/admin/operations');
    await page.getByRole('link', { name: 'Missed today' }).click();
    await expect(page).toHaveURL(/\/admin\/appointments\/missed/);
    await expect(page.getByRole('heading', { name: 'Missed appointments', level: 2 })).toBeVisible();

    await page.goto('/org/kolkata/admin/operations');
    await page.getByRole('button', { name: 'Lab partner queue' }).click();
    await expect(page).toHaveURL(/tab=partner-lab/);
    await expect(page).toHaveURL(/status=pending_dispatch/);
    await expectOpsHeading(page, 'Lab reports');
    await expect(page.getByTestId('active-filter-banner')).toBeVisible();
    await expect(page.getByTestId('active-filter-banner')).toContainText('Awaiting collection');

    await page.goto('/org/kolkata/admin/operations');
    await page.getByRole('button', { name: 'Enquiry queue' }).click();
    await expect(page).toHaveURL(/tab=enquiries/);
    await expect(page).not.toHaveURL(/paymentStatus=/);
    await expectOpsHeading(page, 'Enquiries');

    await page.goto('/org/kolkata/admin/operations');
    await page.getByRole('button', { name: 'Collect payments' }).click();
    await expect(page).toHaveURL(/tab=orders/);
    await expect(page).toHaveURL(/paymentStatus=pending/);
    await expectOpsHeading(page, 'Orders');
    await expect(page.getByTestId('active-filter-banner')).toBeVisible();
    await expect(page.getByTestId('active-filter-banner')).toContainText('Pending');
  });

  test('overview KPI cards drill down', async ({ page }) => {
    await page.goto('/org/kolkata/admin/operations');
    await expectOpsHeading(page, 'Overview');

    await page.getByRole('link', { name: /Unpaid orders/i }).click();
    await expect(page).toHaveURL(/tab=orders/);
    await expect(page).toHaveURL(/paymentStatus=unpaid/);
    await expect(page.getByTestId('active-filter-banner')).toContainText('Unpaid');
  });

  test('legacy redirects resolve to operations tabs', async ({ page }) => {
    const redirects = [
      { path: '/org/kolkata/admin/enquiries', heading: 'Enquiries' },
      { path: '/org/kolkata/admin/appointments', heading: 'Appointments' },
      { path: '/org/kolkata/admin/sample-collections', heading: 'Lab reports' },
    ];

    for (const r of redirects) {
      await page.goto(r.path);
      await expectOpsHeading(page, r.heading);
    }
  });

  test('orders tab filters collapsed by default', async ({ page }) => {
    await page.goto('/org/kolkata/admin/operations?tab=orders');
    await expectOpsHeading(page, 'Orders');
    await expect(page.getByRole('button', { name: 'Show filters' })).toBeVisible();
    await expect(page.locator('#ops-order-status')).not.toBeVisible();
  });

  test('enquiries tab pagination and filter toggle', async ({ page }) => {
    await page.goto('/org/kolkata/admin/operations?tab=enquiries');
    await expectOpsHeading(page, 'Enquiries');
    await expect(page.getByRole('button', { name: 'Show filters' })).toBeVisible();
    await expect(page.getByText(/Showing \d+–\d+ of \d+/)).toBeVisible();

    const nextBtn = page.getByLabel('Next page');
    if (await nextBtn.isEnabled()) {
      const before = await page.getByText(/Showing \d+–\d+ of \d+/).textContent();
      await nextBtn.click();
      await expect(page.getByText(/Showing \d+–\d+ of \d+/)).not.toHaveText(before ?? '');
    }
  });
});
