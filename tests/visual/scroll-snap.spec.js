import { expect, test } from '@playwright/test';

// Section snap scrolling on the portfolio (docs/SCROLL_DESIGN.md §6).
const URL = 'http://localhost:5182/';

const top = (page, id) => page.evaluate((id) => Math.round(document.getElementById(id).getBoundingClientRect().top + window.scrollY), id);
const scrollY = (page) => page.evaluate(() => Math.round(window.scrollY));
/** Wait until scrolling (and snapping) has stopped, then return scrollY. */
const settled = async (page) => {
  let last = -1;
  await expect
    .poll(async () => {
      const y = await scrollY(page);
      const still = y === last;
      last = y;
      return still;
    }, { intervals: [250], timeout: 8000 })
    .toBe(true);
  return last;
};

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
  await page.waitForLoadState('networkidle');
  await page.mouse.move(300, 300); // wheel events go to the element under the pointer
});

test('snap is on the root scroller, every section is a snap target', async ({ page }) => {
  const css = await page.evaluate(() => ({
    root: getComputedStyle(document.documentElement).scrollSnapType,
    aligns: [...document.querySelectorAll('main > section')].map((s) => getComputedStyle(s).scrollSnapAlign),
    footer: getComputedStyle(document.querySelector('footer')).scrollSnapAlign,
  }));
  expect(css.root).toBe('y mandatory');
  expect(css.aligns).toEqual(Array(6).fill('start'));
  expect(css.footer).toBe('end');
});

// Synthetic wheel deltas are precise (trackpad-like) scrolling: the page settles on
// the nearest section. A physical wheel notch or a key press is directional.
test('a trackpad-sized gesture from the hero settles on About', async ({ page }) => {
  const vh = await page.evaluate(() => window.innerHeight);
  await page.mouse.wheel(0, vh * 0.6);
  expect(Math.abs((await settled(page)) - (await top(page, 'about')))).toBeLessThanOrEqual(2);
});

test('PageDown steps to the next section', async ({ page }) => {
  await page.keyboard.press('PageDown');
  expect(Math.abs((await settled(page)) - (await top(page, 'about')))).toBeLessThanOrEqual(2);
});

test('a small nudge never leaves the page resting between sections', async ({ page }) => {
  await page.mouse.wheel(0, 120);
  const y = await settled(page);
  const tops = await Promise.all(['hero', 'about'].map((id) => top(page, id)));
  expect(tops.some((t) => Math.abs(y - t) <= 2), `rested at ${y}`).toBe(true);
});

test('a wheel step inside a tall section scrolls within it', async ({ page }) => {
  const start = await top(page, 'experience');
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), start);
  await settled(page);
  await page.mouse.wheel(0, 200);
  const y = await settled(page);
  expect(y).toBeGreaterThan(start); // moved inside Experience…
  expect(y).toBeLessThan(await top(page, 'skills')); // …without jumping to Skills
});

test('the end of the page shows the footer', async ({ page }) => {
  await page.keyboard.press('End');
  await settled(page);
  const footer = await page.evaluate(() => {
    const r = document.querySelector('footer').getBoundingClientRect();
    return { top: r.top, bottom: Math.round(r.bottom), vh: window.innerHeight };
  });
  expect(footer.top).toBeGreaterThanOrEqual(0);
  expect(footer.bottom).toBeLessThanOrEqual(footer.vh + 1);
});

test('the hero CTA lands on Contact', async ({ page }) => {
  await page.getByRole('link', { name: 'Get in touch' }).click();
  const y = await settled(page);
  // Contact is the last section, so the snap may stop short of its top to keep the footer in view.
  const vh = await page.evaluate(() => window.innerHeight);
  const contact = await top(page, 'contact');
  expect(y).toBeGreaterThanOrEqual(contact - vh / 2);
  expect(await page.locator('#contact h2').isVisible()).toBe(true);
});

test('dot nav marks the active section and moves on Enter', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hidden on narrow screens');
  const nav = page.getByRole('navigation', { name: 'Sections' });
  await expect(nav.getByRole('link', { name: 'Introduction' })).toHaveAttribute('aria-current', 'true');
  await nav.getByRole('link', { name: 'Skills' }).focus();
  await page.keyboard.press('Enter');
  const y = await settled(page);
  expect(Math.abs(y - (await top(page, 'skills')))).toBeLessThanOrEqual(2);
  await expect(nav.getByRole('link', { name: 'Skills' })).toHaveAttribute('aria-current', 'true');
  await expect(nav.locator('a[aria-current]')).toHaveCount(1);
});

test('a deep link on first load opens at that section', async ({ page }) => {
  await page.goto(`${URL}#experience`);
  expect(Math.abs((await settled(page)) - (await top(page, 'experience')))).toBeLessThanOrEqual(2);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('falls back to proximity snapping', async ({ page }) => {
    // 'proximity' is the default strictness, so it serialises as plain 'y'.
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toMatch(/^y( proximity)?$/);
  });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('nothing is clipped and the dots are hidden', async ({ page }) => {
    const m = await page.evaluate(() => {
      const secs = [...document.querySelectorAll('main > section')];
      return {
        fit: secs.every((s) => s.scrollHeight <= s.clientHeight + 1),
        minFull: secs.every((s) => s.getBoundingClientRect().height >= window.innerHeight - 1),
      };
    });
    expect(m).toEqual({ fit: true, minFull: true });
    await expect(page.getByRole('navigation', { name: 'Sections' })).toBeHidden();
  });
});
