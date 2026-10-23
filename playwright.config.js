import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
import { firefox, webkit } from 'playwright-core';

// Visual regression for the playground (REACT_DESIGN.md §12 step 8).
// First run: `npm run test:visual -- --update-snapshots` to record baselines.

// Snap scrolling differs between engines, so its spec also runs in WebKit and
// Firefox, once installed: `npx playwright install webkit firefox`.
const installed = (b) => {
  try {
    return existsSync(b.executablePath());
  } catch {
    return false;
  }
};
const SNAP = /scroll-snap\.spec/;
const viewport = { viewport: { width: 1000, height: 700 }, deviceScaleFactor: 1 };

export default defineConfig({
  testDir: 'tests/visual',
  // Every test renders a WebGL scene; in parallel they fight over the GPU, frames
  // slow down, and the engine clock (capped at 0.1 s per frame) drifts behind
  // wall-clock time. One at a time is both faster and deterministic.
  workers: 1,
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], ...viewport } },
    ...(installed(webkit) ? [{ name: 'webkit', testMatch: SNAP, use: { ...devices['Desktop Safari'], ...viewport } }] : []),
    ...(installed(firefox) ? [{ name: 'firefox', testMatch: SNAP, use: { ...devices['Desktop Firefox'], ...viewport } }] : []),
  ],
  webServer: [
    { command: 'npx vite apps/playground --port 5180 --strictPort', url: 'http://localhost:5180', reuseExistingServer: true },
    { command: 'npx vite apps/portfolio-example --port 5182 --strictPort', url: 'http://localhost:5182', reuseExistingServer: true },
    // The production build, served from /resume/ as on GitHub Pages (production.spec.js).
    {
      command: 'npm run build -w @dragon/portfolio-example && npx vite preview apps/portfolio-example --port 5183 --strictPort',
      url: 'http://localhost:5183/resume/',
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
