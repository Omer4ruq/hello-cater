import type { Page } from '@playwright/test';

/**
 * Whether this environment has a database behind it.
 *
 * Suites that need real rows check this and skip rather than fail, so
 * the public-site, SEO and accessibility suites still provide value in
 * a secretless CI run.
 */
export const hasDatabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** Demo credentials from supabase/seed_demo.sql. Local and staging only. */
export const DEMO_PASSWORD = 'DemoPassword2026!';

export const DEMO_ACCOUNTS = {
  customer: 'customer@demo.eventlybd.test',
  companyAdmin: 'company.admin@demo.eventlybd.test',
  partner: 'caterer@demo.eventlybd.test',
  ops: 'ops@demo.eventlybd.test',
  finance: 'finance@demo.eventlybd.test',
} as const;

export async function signIn(page: Page, email: string, password = DEMO_PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });
}

/**
 * Collects obvious accessibility defects without pulling in a full axe
 * run: images missing alt text, controls with no accessible name, and
 * heading levels that skip.
 */
export async function findAccessibilityIssues(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const issues: string[] = [];

    document.querySelectorAll('img').forEach((img) => {
      if (!img.hasAttribute('alt')) {
        issues.push(`<img> without alt: ${img.getAttribute('src')?.slice(0, 60)}`);
      }
    });

    document.querySelectorAll('button, a[href], input, select, textarea').forEach((el) => {
      const element = el as HTMLElement;
      if (element.getAttribute('aria-hidden') === 'true') return;
      if (element.hasAttribute('disabled')) return;

      const name =
        element.getAttribute('aria-label') ??
        element.getAttribute('aria-labelledby') ??
        element.getAttribute('title') ??
        (element.id ? document.querySelector(`label[for="${element.id}"]`)?.textContent : null) ??
        element.closest('label')?.textContent ??
        element.textContent;

      if (!name || !name.trim()) {
        issues.push(`${element.tagName.toLowerCase()} without an accessible name`);
      }
    });

    const levels = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
      .map((h) => Number(h.tagName[1]));
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) {
        issues.push(`Heading level jumps from h${levels[i - 1]} to h${levels[i]}`);
      }
    }

    if (document.querySelectorAll('h1').length !== 1) {
      issues.push(`Page has ${document.querySelectorAll('h1').length} <h1> elements, expected 1`);
    }

    return issues;
  });
}
