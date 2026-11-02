import {defineConfig, devices} from '@playwright/test';

const suppliedBase = process.env.ARDOR_E2E_BASE_URL;
export default defineConfig({
  testDir: './tests',
  testMatch: 'e2e.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: {timeout: 10_000},
  outputDir: 'receipts/playwright-artifacts',
  reporter: [['list'], ['./tests/browser-reporter.ts']],
  // Call/source traces and explicit/failure screenshots remain. Full per-action DOM/
  // screencast recording exhausted a controlled Firefox journey without changing assertions.
  use: {baseURL: suppliedBase ?? 'http://127.0.0.1:4322', trace: {mode: 'retain-on-failure', snapshots: false, screenshots: false, sources: true}, screenshot: 'only-on-failure'},
  webServer: suppliedBase ? undefined : {
    // Astro may infer background mode under an agent; Playwright must own a foreground server.
    command: 'python3.12 -B scripts/serve_dist.py --port 4322',
    url: 'http://127.0.0.1:4322',
    reuseExistingServer: false,
  },
  projects: [
    {name: 'chromium', use: {...devices['Desktop Chrome'], browserName: 'chromium'}},
    {name: 'firefox', use: {...devices['Desktop Firefox'], browserName: 'firefox'}},
    {name: 'webkit', use: {...devices['Desktop Safari'], browserName: 'webkit'}},
  ],
});
