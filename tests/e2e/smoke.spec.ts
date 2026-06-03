import { expect, test } from '@playwright/test';

test('loads the dashboard shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByPlaceholder('Search')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use my location' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Location' })).toBeVisible();
});
