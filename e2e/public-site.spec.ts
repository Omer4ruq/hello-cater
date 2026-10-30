import { test, expect } from '@playwright/test';
import { findAccessibilityIssues } from './helpers';

/**
 * Public site.
 *
 * Runs without any credentials: the content layer falls back to
 * built-in copy when the database is unavailable, so these tests verify
 * the front door in every environment.
 */

test.describe('homepage', () => {
  test('renders the hero, value proposition and primary CTAs', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Plan your event',
    );
    await expect(
      page.getByRole('link', { name: /plan an event/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /explore services/i }).first(),
    ).toBeVisible();
  });

  test('explains how it works', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /one brief in\. a finished event out/i }),
    ).toBeVisible();
    await expect(page.getByText(/tell us what you need/i).first()).toBeVisible();
  });

  test('shows the FAQ and expands an answer', async ({ page }) => {
    await page.goto('/');
    const faq = page.getByRole('group').filter({ hasText: /cost anything to submit/i }).first();
    await faq.click();
    await expect(faq).toContainText(/free and non-binding/i);
  });

  test('has a working skip link for keyboard users', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.getByRole('link', { name: /skip to main content/i });

    // WebKit on macOS only tabs to links when full keyboard access is
    // enabled, so focus it directly rather than asserting Tab order.
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    // It must become visible once focused, not stay screen-reader-only.
    await expect(skipLink).toBeVisible();

    await skipLink.press('Enter');
    await expect(page.locator('#main')).toBeVisible();
  });

  test('has no obvious accessibility defects', async ({ page }) => {
    await page.goto('/');
    expect(await findAccessibilityIssues(page)).toEqual([]);
  });

  test('sets canonical, OpenGraph and description metadata', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
  });

  test('emits Organization structured data', async ({ page }) => {
    await page.goto('/');
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = scripts.map((raw) => JSON.parse(raw)['@type']);
    expect(types).toContain('Organization');
  });
});

test.describe('navigation', () => {
  test('reaches the key marketing pages', async ({ page }) => {
    for (const [path, heading] of [
      ['/services', /every service an event/i],
      ['/events', /how bangladesh celebrates/i],
      ['/partners', /verified catering and event partners/i],
      ['/how-it-works', /managed marketplace, not a directory/i],
      ['/corporate', /stop chasing five caterers/i],
      ['/become-a-partner', /matched work/i],
      ['/about', /managed marketplace|catering and events/i],
      ['/contact', /talk to our team/i],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
    }
  });

  test('mobile navigation opens and closes', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only behaviour');
    await page.goto('/');
    await page.getByRole('button', { name: /open menu/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('link', { name: 'Catering' })).toBeVisible();
    await page.getByRole('button', { name: /close/i }).first().click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('footer links to every legal page', async ({ page }) => {
    await page.goto('/');
    for (const name of [/terms of service/i, /privacy policy/i, /cancellation & refunds/i, /partner agreement/i]) {
      await expect(page.getByRole('contentinfo').getByRole('link', { name })).toBeVisible();
    }
  });
});

test.describe('legal pages', () => {
  test('render and are clearly marked as drafts pending review', async ({ page }) => {
    for (const path of ['/terms', '/privacy', '/refund-policy', '/partner-agreement']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      // These must never be presented as finalised legal documents.
      await expect(page.getByText(/pending legal review/i)).toBeVisible();
      await expect(page.getByText(/bangladesh-qualified lawyer/i)).toBeVisible();
    }
  });
});

test.describe('SEO endpoints', () => {
  test('sitemap.xml lists the core pages', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('<urlset');
    for (const path of ['/plan', '/services', '/events', '/partners', '/corporate']) {
      expect(body).toContain(path);
    }
  });

  test('robots.txt points at the sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('Sitemap:');
    // Private surfaces must never be advertised to crawlers.
    expect(body).toMatch(/Disallow/);
  });

  test('a social share image is generated', async ({ request }) => {
    const response = await request.get('/opengraph-image');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  });
});

test.describe('operational endpoints', () => {
  test('health check reports each dependency', async ({ request }) => {
    const response = await request.get('/api/health');
    // 503 when the database is not configured; both are valid answers.
    expect([200, 503]).toContain(response.status());

    const body = await response.json();
    expect(body).toHaveProperty('checks.database');
    expect(body).toHaveProperty('checks.email');
    expect(body).toHaveProperty('checks.payments');
    // It must never leak connection details.
    expect(JSON.stringify(body)).not.toMatch(/postgres:\/\/|service_role|eyJ/);
  });

  test('unknown pages return a helpful 404', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: /could not find that page/i })).toBeVisible();
  });
});

test.describe('security headers', () => {
  test('sends the expected hardening headers', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['content-security-policy']).toContain("object-src 'none'");
    // Next.js version disclosure is switched off.
    expect(headers['x-powered-by']).toBeUndefined();
  });
});
