import { test, expect } from '@playwright/test';

/**
 * Smoke tests — verify the app loads and core navigation works.
 *
 * Prerequisites:
 *   - Docker stack running: docker compose up -d
 *   - App accessible at http://localhost:3000
 *   - .htpasswd configured OR auth_basic commented out in nginx.conf
 *
 * Run: npm run e2e (from project root)
 */

test.describe('App loads', () => {
  test('dashboard renders without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // No React error #130 or similar
    const reactErrors = consoleErrors.filter(
      (e) => e.includes('Minified React error') || e.includes('Element type is invalid')
    );
    expect(reactErrors, `React errors found: ${reactErrors.join('\n')}`).toHaveLength(0);
  });

  test('Intelligence Feed section is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Either stories are shown or the EmptyFeed CTA is shown
    const feedHeading = page.getByText('Intelligence Feed');
    const emptyFeed = page.getByText('No stories yet');
    const hasContent = await feedHeading.isVisible().catch(() => false);
    const isEmpty = await emptyFeed.isVisible().catch(() => false);

    expect(hasContent || isEmpty, 'Neither Intelligence Feed nor EmptyFeed is visible').toBe(true);
  });
});

test.describe('Sidebar navigation', () => {
  test('navigates to /analytics without crashing', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Metrics');
    await expect(page).toHaveURL('/analytics');
    // No error boundary shown
    await expect(page.getByText('Something went wrong')).not.toBeVisible();
  });

  test('navigates to /calendar without crashing', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Calendar');
    await expect(page).toHaveURL('/calendar');
    await expect(page.getByText('Something went wrong')).not.toBeVisible();
  });

  test('navigates to /settings without crashing', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Settings Hub');
    await expect(page).toHaveURL('/settings');
    await expect(page.getByText('Something went wrong')).not.toBeVisible();
  });

  test('navigates back to dashboard', async ({ page }) => {
    await page.goto('/analytics');
    await page.click('text=Dashboard');
    await expect(page).toHaveURL('/');
  });
});

test.describe('Pipeline', () => {
  test('Run Pipeline button is visible in header', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // QuickActions renders a pipeline button
    const pipelineBtn = page.getByTitle(/run pipeline|fetch/i).or(page.getByText(/run pipeline/i));
    await expect(pipelineBtn.first()).toBeVisible();
  });
});

test.describe('Deep links', () => {
  test('direct navigation to /analytics loads correctly', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Something went wrong')).not.toBeVisible();
  });

  test('direct navigation to /research loads correctly', async ({ page }) => {
    await page.goto('/research');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Something went wrong')).not.toBeVisible();
  });
});
