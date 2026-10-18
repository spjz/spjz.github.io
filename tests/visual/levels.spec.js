import { expect, test } from '@playwright/test';

// "Pixel to voxel" section experiences (docs/SECTION_EXPERIENCE_DESIGN.md §4).
// window.__voxel is the scene handle, exposed by the portfolio in dev builds only.
const URL = 'http://localhost:5182/';
const EMAIL = ['papaver', 'josepherum', '@', 'gmail.com'].join('');

const ready = async (page, url = URL) => {
  await page.goto(url);
  await page.waitForFunction(() => window.__voxel?.bus?.engine, null, { timeout: 20000 });
};
const go = async (page, id) => {
  await page.locator(`.section-nav a[href="#${id}"]`).click();
  await expect(page.locator(`.section-nav a[href="#${id}"]`)).toHaveAttribute('aria-current', 'true');
};
const camera = (page) => page.evaluate(() => window.__voxel.getState().camera);
const effect = (page, id) =>
  page.evaluate((id) => {
    const e = window.__voxel.bus.engine.stack.get(id);
    return e && { strength: e.strength, t0: e.envelope.t0, period: e.envelope.spec.period, angle: e.params.angle };
  }, id);
/** Viewport point at the middle of the dragon's voxels. */
const dragonCentre = (page) =>
  page.evaluate(() => {
    const { scene, camera, gl } = window.__voxel.bus.three;
    let mesh;
    scene.traverse((o) => { if (o.isInstancedMesh) mesh = o; });
    mesh.computeBoundingBox();
    const c = mesh.boundingBox.getCenter(mesh.boundingBox.min.clone());
    mesh.localToWorld(c).project(camera);
    const r = gl.domElement.getBoundingClientRect();
    return { x: r.left + ((c.x + 1) / 2) * r.width, y: r.top + ((1 - c.y) / 2) * r.height };
  });

test('every level has its HUD label and a numbered nav square', async ({ page }) => {
  await page.goto(URL);
  const huds = await page.locator('main > section > .hud').allTextContents();
  expect(huds).toEqual(['Level 1 · Spawn', 'Level 2 · Character sheet', 'Level 3 · Level select', 'Level 4 · The road so far', 'Level 5 · Crafting table', 'Level 6 · Save point']);
  await expect(page.locator('.section-nav .lvl')).toHaveText(['1', '2', '3', '4', '5', '6']);
});

test('the dragon spawns on load, then each level moves the camera to its pose', async ({ page }) => {
  await ready(page);
  expect((await effect(page, 'spawn')).t0).not.toBeNull();
  await go(page, 'skills');
  // Within the 3° cursor parallax of the pose.
  await expect.poll(async () => Math.abs((await camera(page)).azimuth) <= 4, { timeout: 8000 }).toBe(true);
  await go(page, 'about');
  await expect.poll(async () => Math.round((await camera(page)).distance), { timeout: 8000 }).toBe(76);
});

test('a level builds in the first time it is reached', async ({ page }) => {
  await page.goto(URL);
  const clip = () => page.locator('#skills .build').first().evaluate((el) => getComputedStyle(el).clipPath);
  expect(await clip()).toMatch(/inset\(0px 100% 100% 0px\)/);
  await go(page, 'skills');
  await expect.poll(clip, { timeout: 4000 }).not.toMatch(/100%/);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('no build-in, no typing, no spawn', async ({ page }) => {
    await ready(page);
    expect(await page.locator('#skills .build').first().evaluate((el) => getComputedStyle(el).clipPath)).toBe('none');
    expect(await page.locator('.typed').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    expect((await effect(page, 'spawn')).t0).toBeNull();
  });
});

test('clicking the dragon counts explosions in the hero prompt', async ({ page }) => {
  await ready(page);
  await expect(page.locator('.hint .prompt')).toHaveText('▶ PRESS DRAGON');
  await expect.poll(async () => (await page.evaluate(() => window.__voxel.bus.engine.stack.get('spawn').envelope.playing(window.__voxel.bus.engine.stack.lastT, window.__voxel.bus.engine.stack.model))), { timeout: 8000 }).toBe(false);
  const { x, y } = await dragonCentre(page);
  await page.mouse.move(x, y);
  await page.mouse.click(x, y);
  await expect(page.locator('.hint .prompt')).toHaveText('Again?');
  expect(await page.evaluate(() => sessionStorage.getItem('dragon:explosions'))).toBe('1');
});

test('"Play here" loads the game only on demand, in a dialog, and pauses the dragon', async ({ page }) => {
  let requests = 0;
  await page.route('https://spjz.github.io/**', (r) => {
    requests++;
    return r.fulfill({ contentType: 'text/html', body: '<h1>game</h1>' });
  });
  await ready(page);
  await go(page, 'work');
  expect(await page.locator('iframe').count()).toBe(0);
  expect(requests).toBe(0);

  await page.getByRole('button', { name: '▶ Play here' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('iframe')).toHaveAttribute('src', 'https://spjz.github.io/henhouse-panic/');
  await expect.poll(() => requests).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__voxel.getState().paused)).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(await page.locator('iframe').count()).toBe(0);
  expect(await page.evaluate(() => window.__voxel.getState().paused)).toBe(false);
});

test('the voxel dragon cartridge\'s Play goes to the hero and explodes it', async ({ page }) => {
  await ready(page);
  await go(page, 'work');
  await page.locator('a.play[href="#hero"]').click();
  // Smooth-scrolls back two levels first; slow when the GPU is busy.
  await expect.poll(async () => (await effect(page, 'boom')).t0, { timeout: 15000 }).not.toBeNull();
  await expect(page.locator('.hint .prompt')).toHaveText('Again?');
});

test('the road: checkpoints raise flags and the inventory unpacks', async ({ page }) => {
  await ready(page);
  await go(page, 'experience');
  const count = () => page.locator('.backpack-items li').count();
  const atTapp = await count();
  await expect(page.locator('.backpack-title')).toContainText('Tapp');
  const last = page.locator('.road > li').last();
  // To the end of the road (bottom of the section in view).
  await page.evaluate(() => {
    const road = document.querySelector('.road');
    window.scrollTo({ top: road.getBoundingClientRect().bottom + window.scrollY - window.innerHeight + 20, behavior: 'instant' });
  });
  await expect(page.locator('.backpack-title')).toContainText('Just Develop It');
  expect(await count()).toBeLessThan(atTapp);
  await expect(last).toHaveClass(/reached/);
  expect(await page.locator('.walker').evaluate((el) => parseFloat(el.style.getPropertyValue('--walk')))).toBeGreaterThan(200);
});

test('hovering a skill group tints the dragon', async ({ page }) => {
  await ready(page);
  await go(page, 'skills');
  await page.locator('#skills .stack').nth(1).hover();
  await expect.poll(async () => (await effect(page, 'skill-tint')).strength, { timeout: 4000 }).toBeGreaterThan(0.3);
  await page.mouse.move(5, 5);
  await expect.poll(async () => (await effect(page, 'skill-tint')).strength, { timeout: 4000 }).toBeLessThan(0.1);
});

test('save point: the dragon waves, the address copies, the status is announced', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await ready(page);
  await go(page, 'contact');
  const crystal = page.locator('#contact a[href^="mailto:"]');
  await crystal.hover();
  await expect.poll(async () => (await effect(page, 'wings')).period).toBe(0.4);
  // Keep the mailto: from navigating; the copy runs first in the click handler.
  await crystal.evaluate((a) => a.addEventListener('click', (e) => e.preventDefault()));
  await crystal.click();
  await expect(page.getByRole('status')).toHaveText('✓ Saved: address copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(EMAIL);
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('the dragon steps back behind content-heavy levels', async ({ page }) => {
    await ready(page);
    const bg = page.locator('[aria-hidden="true"]:has(canvas)');
    await expect(bg).toHaveCSS('opacity', '1');
    await page.evaluate(() => document.getElementById('about').scrollIntoView({ behavior: 'instant' }));
    await expect.poll(() => bg.evaluate((el) => getComputedStyle(el).opacity), { timeout: 4000 }).toBe('0.35');
  });
});
