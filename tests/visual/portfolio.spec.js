import { expect, test } from '@playwright/test';

// The real portfolio page (apps/portfolio-example): content, contact privacy and meta.
const URL = 'http://localhost:5182/';
const EMAIL = ['papaver', 'josepherum', '@', 'gmail.com'].join('');

test('served HTML and scripts never contain the email address', async ({ page }) => {
  const bodies = [];
  page.on('response', async (res) => {
    const type = res.headers()['content-type'] ?? '';
    if (/html|javascript/.test(type)) bodies.push(await res.text().catch(() => ''));
  });
  const html = await (await page.request.get(URL)).text();
  expect(html).not.toContain(EMAIL);
  await page.goto(URL);
  await page.waitForLoadState('networkidle');
  expect(bodies.length).toBeGreaterThan(3);
  for (const b of bodies) expect(b).not.toContain(EMAIL);
});

test('renders every section, the assembled mailto and the photo placeholder', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Joe Doherty');
  await expect(page.locator('main > section')).toHaveCount(6);
  for (const id of ['hero', 'about', 'work', 'experience', 'skills', 'contact']) {
    await expect(page.locator(`#${id} h1, #${id} h2`).first()).toBeVisible();
  }

  const mail = page.locator('#contact a[href^="mailto:"]');
  await expect(mail).toHaveAttribute('href', `mailto:${EMAIL}`);
  await expect(mail).toHaveText(EMAIL);

  await expect(page.getByRole('img', { name: 'Joe Doherty: photo coming soon' })).toBeVisible();
  await expect(page.locator('.card')).toHaveCount(6);
  await expect(page.locator('.timeline > li').first()).toContainText('May 2025 – present');
});

test('external links are announced and point at the agreed sites', async ({ page }) => {
  await page.goto(URL);
  const external = page.locator('main a[href^="https://"]');
  const hrefs = await external.evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  for (const site of ['https://paytapp.co', 'https://mindworks.co.uk', 'https://www.monicavinader.com/', 'https://keepthinking.it', 'https://github.com/spjz', 'https://myanimelist.net/animelist/sPJz', 'https://www.last.fm/user/Bjehsus/']) {
    expect(hrefs).toContain(site);
  }
  const announced = await external.evaluateAll((as) => as.every((a) => a.querySelector('.sr-only')?.textContent.includes('external')));
  expect(announced).toBe(true);
});

test('share meta and structured data are present and private', async ({ page }) => {
  await page.goto(URL);
  await expect(page).toHaveTitle('Joe Doherty · Full-stack software engineer');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://spjz.uk/og.png');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://spjz.uk/');
  expect((await page.request.get(`${URL}og.png`)).status()).toBe(200);
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  expect(ld).toMatchObject({ '@type': 'Person', name: 'Joe Doherty', worksFor: { name: 'Tapp' } });
  expect(JSON.stringify(ld)).not.toMatch(/email|telephone|@gmail/);
});

test('the background stays hidden from assistive tech and click-through', async ({ page }) => {
  await page.goto(URL);
  // The scene is lazy-loaded after the page renders; a cold dev server can take a while.
  const bg = page.locator('[aria-hidden="true"]:has(canvas)');
  await expect(bg).toHaveCount(1, { timeout: 20000 });
  await expect(bg).toHaveCSS('pointer-events', 'none');
});
