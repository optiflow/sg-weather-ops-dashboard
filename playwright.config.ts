import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const databasePath =
  process.env.PLAYWRIGHT_DATABASE_PATH ??
  join(tmpdir(), 'sg-weather-ops-dashboard-playwright', 'weather.db');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [[process.env.CI ? 'dot' : 'list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: `${baseURL}/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 500 },
    env: {
      DATABASE_PATH: databasePath,
      LOG_LEVEL: 'silent',
      PORT: '3000',
      SG_WEATHER_OPS_DEV_PROXY: '0',
      SG_WEATHER_OPS_DEV_WATCH: '0',
    },
  },
});
