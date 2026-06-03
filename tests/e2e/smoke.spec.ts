import { expect, test } from '@playwright/test';

test('loads the dashboard shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByPlaceholder('Search')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use my location' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Location' })).toBeVisible();
  await expect(page.getByLabel('Theme')).toBeVisible();
});

test('keeps the dashboard shell usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  const sidebar = page.locator('aside');
  await expect(sidebar).toBeVisible();
  await expect(page.getByPlaceholder('Search')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use my location' })).toBeVisible();

  const sidebarBox = await sidebar.boundingBox();
  const searchBox = await page.getByPlaceholder('Search').boundingBox();
  const themeBox = await page.getByLabel('Theme').boundingBox();
  expect(sidebarBox?.width).toBeLessThanOrEqual(375);
  expect(searchBox?.y ?? 0).toBeGreaterThan((themeBox?.y ?? 0) + (themeBox?.height ?? 0));
});

test('opens the add location form accessibly', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Location' }).click();

  await expect(page.getByText('New coordinate')).toBeVisible();
  await expect(page.getByLabel('Latitude')).toBeVisible();
  await expect(page.getByLabel('Longitude')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();
});

test('persists accessible theme selection', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Theme').selectOption('terminal');

  await expect(page.locator('body')).toHaveClass(/theme-terminal/);
});
