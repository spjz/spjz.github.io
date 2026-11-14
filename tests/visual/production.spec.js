import { expect, test } from '@playwright/test';

// The production build as GitHub Pages serves it (https://spjz.uk/).
// The dev server can't catch build-only failures: "sideEffects": false once let
// the bundler drop the effect registry, and the page crashed before rendering.
const URL = 'http://localhost:5183/';

test('renders the page and the dragon with no errors or missing assets', async ({ page }) => {
  const problems = [];
  page.on('pageerror', (e) => problems.push(`error: ${e.message}`));
  page.on('response', (r) => r.status() >= 400 && problems.push(`${r.status()} ${r.url()}`));
  page.on('requestfailed', (r) => problems.push(`failed: ${r.url()}`));

  await page.goto(URL);
  await expect(page.locator('main > section')).toHaveCount(6);
  await expect(page.locator('[aria-hidden="true"] canvas')).toHaveCount(1, { timeout: 20000 });
  await page.waitForLoadState('networkidle');

  // Every asset is served from the site root, never a leftover sub-path.
  const assets = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => new URL(r.name).pathname));
  for (const a of assets.filter((p) => !p.startsWith('/@'))) expect(a, a).not.toMatch(/^\/resume\//);
  await expect(page.locator('.walker')).toHaveJSProperty('complete', true);
  expect(await page.locator('.walker').evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);

  expect(problems).toEqual([]);
});

test('ships no dev-only test hook', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[aria-hidden="true"] canvas')).toHaveCount(1, { timeout: 20000 });
  expect(await page.evaluate(() => typeof window.__voxel)).toBe('undefined');
});
