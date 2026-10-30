import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests.
 *
 * The public site is designed to render without a database (the content
 * layer falls back to built-in copy), so the marketing, SEO and
 * accessibility suites run in any environment including CI with no
 * secrets. Suites that need real data skip themselves when Supabase is
 * not configured rather than failing — see e2e/helpers.ts.
 */
const PORT = Number(process.env.PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Bangladesh-facing product: test in the market's locale and timezone.
    locale: 'en-BD',
    timezoneId: 'Asia/Dhaka',
    // Exercises the reduced-motion path and keeps clicks deterministic.
    reducedMotion: 'reduce',
  },

  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run build && npx next start --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
