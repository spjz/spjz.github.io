import { defineConfig, devices } from '@playwright/test';

// Visual regression for the playground (REACT_DESIGN.md §12 step 8).
// First run: `npm run test:visual -- --update-snapshots` to record baselines.
export default defineConfig({
  testDir: 'tests/visual',
  // Every test renders a WebGL scene; in parallel they fight over the GPU, frames
  // slow down, and the engine clock (capped at 0.1 s per frame) drifts behind
  // wall-clock time. One at a time is both faster and deterministic.
  workers: 1,
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  use: { ...devices['Desktop Chrome'], viewport: { width: 1000, height: 700 }, deviceScaleFactor: 1 },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  webServer: [
    { command: 'npx vite apps/playground --port 5180 --strictPort', url: 'http://localhost:5180', reuseExistingServer: true },
    { command: 'npx vite apps/portfolio-example --port 5182 --strictPort', url: 'http://localhost:5182', reuseExistingServer: true },
  ],
});
