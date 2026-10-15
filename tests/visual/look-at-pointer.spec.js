import { expect, test } from '@playwright/test';

// lookAtPointer: faces the camera until the pointer moves, then turns towards it.
const encode = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const state = {
  scene: { subject: 'dragon', preset: 'Idle', grid: false, shadow: false, controls: false, lookAtPointer: true, quality: 'high', reducedMotion: 'ignore' },
  motion: { autoOrbit: 0, drift: false, parallax: 0, transition: 0 },
  camera: { azimuth: 25, elevation: 15, distance: 62, target: [0, 16, 0], fov: 40 },
};

/** Yaw/pitch (degrees) of the group that pointer tracking rotates (the mesh's parent). */
const readLook = (page) =>
  page.evaluate(() => {
    let g = null;
    window.__voxel.bus.three.scene.traverse((o) => { if (o.isInstancedMesh) g = o.parent; });
    return { yaw: (g.rotation.y * 180) / Math.PI, pitch: (g.rotation.x * 180) / Math.PI };
  });

test('faces the camera, then tracks the cursor left and right', async ({ page }) => {
  await page.goto(`http://localhost:5180/?visual#s=${encode(state)}`);
  await page.waitForSelector('body[data-scene-ready]');
  await page.waitForTimeout(1500); // let the damping settle

  // Camera azimuth is 25°, so facing the viewer means yawing ~25°.
  const initial = await readLook(page);
  expect(initial.yaw).toBeGreaterThan(20);
  expect(initial.yaw).toBeLessThan(30);

  const { width, height } = page.viewportSize();
  await page.mouse.move(5, height / 2);
  await page.waitForTimeout(1500);
  const left = await readLook(page);
  expect(left.yaw).toBeLessThan(initial.yaw - 20);

  await page.mouse.move(width - 5, height / 2);
  await page.waitForTimeout(1500);
  const right = await readLook(page);
  expect(right.yaw).toBeGreaterThan(initial.yaw + 10);
  expect(right.yaw).toBeLessThanOrEqual(60.01); // clamped to maxYaw

  // Cursor high up → looks up (negative pitch), clamped to maxPitch.
  await page.mouse.move(width / 2, 5);
  await page.waitForTimeout(1500);
  const up = await readLook(page);
  expect(up.pitch).toBeLessThan(-3);
  expect(up.pitch).toBeGreaterThanOrEqual(-20.01);
});
