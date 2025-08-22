import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // If PW_CHANNEL is set (e.g. 'chrome' or 'msedge'), use the local browser; otherwise use bundled Chromium
        ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL as any } : {}),
      },
    },
  ],
})
