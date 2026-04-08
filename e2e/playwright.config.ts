import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    // Ignore HTTPS errors (self-signed certs in dev)
    ignoreHTTPSErrors: true,
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    // Capture trace on first retry
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Run tests sequentially — the app has shared state (pipeline lock, DB)
  workers: 1,
});
