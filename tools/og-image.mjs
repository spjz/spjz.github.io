#!/usr/bin/env node
// Render the portfolio's Open Graph image (docs/PORTFOLIO_CONTENT.md §2.1):
// a still of the dragon on the site's background, 1200×630, via the
// playground's ?visual mode and the scene handle's snapshot().
//
//   node tools/og-image.mjs [out=apps/portfolio-example/public/og.png]
//
// Starts its own playground dev server on :5181 and stops it afterwards.

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const out = process.argv[2] ?? 'apps/portfolio-example/public/og.png';
const PORT = 5181;

const encode = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const state = {
  scene: {
    subject: 'dragon', preset: 'Idle', lighting: 'lit', background: '#1b1a2e', transparent: false,
    grid: false, axes: false, shadow: true, controls: false, lookAtPointer: false,
    pixelate: 0, scale: 1, quality: 'high', reducedMotion: 'static',
  },
  motion: { autoOrbit: 0, drift: false, parallax: 0, transition: 0 },
  camera: { azimuth: -22, elevation: 10, distance: 58, target: [0, 15.5, 0], fov: 40 },
};

const server = spawn('npx', ['vite', 'apps/playground', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => server.kill('SIGTERM');
process.on('exit', stop);

async function waitForServer(url, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`dev server did not start on ${url}`);
}

try {
  await waitForServer(`http://localhost:${PORT}/`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?visual#s=${encode(state)}`);
  await page.waitForSelector('body[data-scene-ready]');
  await page.waitForTimeout(400);
  const dataUrl = await page.evaluate(() => window.__voxel.snapshot());
  writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  await browser.close();
  console.log(`wrote ${out}`);
} finally {
  stop();
}
