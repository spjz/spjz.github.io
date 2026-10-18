import { expect, test } from '@playwright/test';

// onSubjectClick: clicking the dragon plays one explode cycle, then it returns
// to its prior state; clicks off the dragon, and mid-cycle re-clicks, do nothing.
const encode = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const state = {
  scene: { subject: 'dragon', preset: 'Idle', grid: false, shadow: false, controls: false, lookAtPointer: false, quality: 'high', reducedMotion: 'ignore' },
  motion: { autoOrbit: 0, drift: false, parallax: 0, transition: 0 },
  camera: { azimuth: 0, elevation: 5, distance: 62, target: [0, 16, 0], fov: 40 },
};

/** Boom trigger time and the largest current voxel offset from the explode. */
const probe = (page) =>
  page.evaluate(() => {
    const { stack } = window.__voxel.bus.engine;
    const boom = stack.get('boom');
    let maxOffset = 0;
    for (const v of stack.work.offset) maxOffset = Math.max(maxOffset, Math.abs(v));
    // The explode's own strength right now, across every voxel (0 = no contribution).
    let boomEnv = 0;
    if (boom) for (let i = 0; i < stack.model.count; i++) boomEnv = Math.max(boomEnv, boom.envelope.value(i));
    return { t0: boom ? boom.envelope.t0 : null, maxOffset, boomEnv, playing: boom ? boom.envelope.playing(stack.lastT, stack.model) : false };
  });

test('click on the dragon explodes once, then it reassembles', async ({ page }) => {
  await page.goto(`http://localhost:5180/?visual#s=${encode(state)}`);
  await page.waitForSelector('body[data-scene-ready]');
  const { width, height } = page.viewportSize();

  // Off the dragon (top-left corner): nothing happens.
  await page.mouse.click(10, 10);
  await page.waitForTimeout(300);
  expect((await probe(page)).t0).toBeNull();

  // On the dragon's belly (centre of the view).
  await page.mouse.click(width / 2, height * 0.6);
  await page.waitForTimeout(700); // boom effect is added, then triggered
  const mid = await probe(page);
  expect(mid.t0).not.toBeNull();
  expect(mid.playing).toBe(true);
  expect(mid.boomEnv).toBeGreaterThan(0.5);
  expect(mid.maxOffset).toBeGreaterThan(8); // visibly exploded

  // A second click mid-cycle is ignored (no restart / snap back).
  await page.mouse.click(width / 2, height * 0.6);
  await page.waitForTimeout(100);
  expect((await probe(page)).t0).toBe(mid.t0);

  // After the 2.5 s cycle the explode contributes nothing: prior state. Polled,
  // because the engine clock caps each frame at 0.1 s, so on a slow renderer
  // scene time runs behind wall-clock time.
  await expect.poll(async () => (await probe(page)).playing, { timeout: 15000 }).toBe(false);
  const after = await probe(page);
  expect(after.boomEnv).toBe(0);

  // And it can be triggered again once finished.
  await page.mouse.click(width / 2, height * 0.6);
  await page.waitForTimeout(300);
  expect((await probe(page)).t0).toBeGreaterThan(mid.t0);
});
