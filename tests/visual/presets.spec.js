import { expect, test } from '@playwright/test';

// reducedMotion 'static' renders a single paused frame at t = 0, so each preset
// is a deterministic still. Camera is fixed and panels are hidden via ?visual.
const encode = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const SCENE = { subject: 'dragon', lighting: 'lit', background: '#1b1f2a', transparent: false, driver: 'time', grid: true, axes: false, shadow: true, controls: false, lookAtPointer: false, pixelate: 0, scale: 1, quality: 'high', reducedMotion: 'static' };
const CAMERA = { azimuth: 25, elevation: 15, distance: 62, target: [0, 16, 0], fov: 40 };

for (const preset of ['Idle', 'Party', 'Explode loop', 'Wave']) {
  test(`preset ${preset}`, async ({ page }) => {
    const state = { scene: { ...SCENE, preset }, motion: { autoOrbit: 0, drift: false, parallax: 0, transition: 0 }, camera: CAMERA };
    await page.goto(`http://localhost:5180/?visual#s=${encode(state)}`);
    await page.waitForSelector('body[data-scene-ready]');
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot(`${preset.toLowerCase().replace(/\s+/g, '-')}.png`);
  });
}

test('flat lighting keeps the reference palette exactly', async ({ page }) => {
  const state = { scene: { ...SCENE, preset: 'Idle', lighting: 'flat', grid: false, shadow: false }, motion: { transition: 0 }, camera: { ...CAMERA, azimuth: 0, elevation: 0 }, effects: [] };
  await page.goto(`http://localhost:5180/?visual#s=${encode(state)}`);
  await page.waitForSelector('body[data-scene-ready]');
  await page.waitForTimeout(300);
  // Sample the centre of the belly: must be the sprite's #ffd95a (no tone mapping).
  const px = await page.evaluate(async () => {
    // snapshot() renders and reads in one task (no preserveDrawingBuffer needed).
    const img = new Image();
    img.src = window.__voxel.snapshot();
    await img.decode();
    const c = { width: img.width, height: img.height };
    const g = document.createElement('canvas');
    g.width = c.width;
    g.height = c.height;
    const ctx = g.getContext('2d');
    ctx.drawImage(img, 0, 0);
    let best = null;
    // Find the pixel closest to the belly colour in the lower-middle region.
    for (let y = Math.floor(c.height * 0.55); y < c.height * 0.8; y += 2) {
      for (let x = Math.floor(c.width * 0.4); x < c.width * 0.6; x += 2) {
        const [r, gg, b] = ctx.getImageData(x, y, 1, 1).data;
        const score = -((r - 0xff) ** 2 + (gg - 0xd9) ** 2 + (b - 0x5a) ** 2);
        if (!best || score > best.score) best = { score, rgb: [r, gg, b] };
      }
    }
    return best.rgb;
  });
  expect(px[0]).toBeGreaterThan(245);
  expect(Math.abs(px[1] - 0xd9)).toBeLessThan(6);
  expect(Math.abs(px[2] - 0x5a)).toBeLessThan(6);
});
