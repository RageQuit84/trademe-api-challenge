import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load .env before the config (and therefore env.ts) is evaluated.
dotenv.config();

// A trailing slash is required so relative request paths (e.g. `mytrademe/...`)
// resolve under `/v1` instead of replacing it at the host root.
const API_BASE_URL = (process.env.API_BASE_URL ?? 'https://api.tmsandbox.co.nz/v1').replace(
  /\/?$/,
  '/',
);

export default defineConfig({
  testDir: './tests',
  // The shared sandbox is rate-limited, so keep concurrency low and avoid flaky
  // parallel mutations of a single account's watchlist.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: API_BASE_URL },
    },
    {
      name: 'contract',
      testDir: './tests/contract',
      // Pact spins up its own mock provider; no shared baseURL needed.
    },
  ],
});
