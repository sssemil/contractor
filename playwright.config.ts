import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173' + (process.env.VITE_BASE_PATH || '/');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm preview --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
  },
});
