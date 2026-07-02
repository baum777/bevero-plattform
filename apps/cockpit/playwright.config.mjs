// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: '../../assets/Screenshots/e2e-report', open: 'never' }]],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'off',
  },

  projects: [
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_FIREFOX_PATH,
        },
      },
    },
  ],

  // Kein webServer hier — manuell starten mit npm run dev:cockpit + dev:api
});
