import { test, expect } from '@playwright/test';
import { findAccessibilityIssues } from './helpers';

/**
 * The event request wizard.
 *
 * Client-side behaviour — step gating, validation, draft persistence and
 * the review summary — is exercised without needing a database. The
 * final submit needs one, so it is covered separately.
 */

test.describe('request wizard', () => {
  test('starts on step one with the rail visible', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.getByText(/step 1 of 10/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /what are you planning/i })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /request steps/i })).toBeVisible();
  });

  test('blocks progress until the step is valid', async ({ page }) => {
    await page.goto('/plan');
    await page.getByRole('button', { name: /continue/i }).click();
    // Still on step one, with a visible error.
    await expect(page.getByText(/step 1 of 10/i)).toBeVisible();
    await expect(page.getByRole('alert').first()).toBeVisible();
  });

  test('the back button is disabled on the first step', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.getByRole('button', { name: /^back$/i })).toBeDisabled();
  });

  test('advances through the first steps and validates the date', async ({ page }) => {
    await page.goto('/plan');

    const firstEventType = page.getByRole('radio').first();
    const optionCount = await page.getByRole('radio').count();
    test.skip(optionCount === 0, 'Event type catalogue requires a database');

    await firstEventType.check();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByText(/step 2 of 10/i)).toBeVisible();

    // An empty date must not pass.
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByText(/step 2 of 10/i)).toBeVisible();

    // The date is a calendar popover: open it, move two months ahead, pick.
    await page.getByLabel('Event date').click();
    await expect(page.getByRole('grid').locator('button:focus')).toBeVisible();
    await page.keyboard.press('PageDown');
    await page.keyboard.press('PageDown');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('grid')).toBeHidden();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByText(/step 3 of 10/i)).toBeVisible();
  });

  test('keeps the draft across a reload', async ({ page }) => {
    await page.goto('/plan');
    const optionCount = await page.getByRole('radio').count();
    test.skip(optionCount === 0, 'Event type catalogue requires a database');

    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByText(/step 2 of 10/i)).toBeVisible();

    await page.reload();
    // The wizard restores the step it was on.
    await expect(page.getByText(/step 2 of 10/i)).toBeVisible();
  });

  test('prefills from the homepage quick form', async ({ page }) => {
    await page.goto('/');
    const optionCount = await page.locator('select').first().locator('option').count();
    test.skip(optionCount <= 1, 'Event type catalogue requires a database');

    await page.locator('select').first().selectOption({ index: 1 });
    await page.getByRole('button', { name: /get proposals/i }).click();

    await page.waitForURL(/\/plan\?/);
    // The chosen event type arrives as a query parameter and is preselected.
    expect(page.url()).toContain('eventType=');
    await expect(page.getByRole('radio').first()).toBeVisible();
  });

  test('has no obvious accessibility defects', async ({ page }) => {
    await page.goto('/plan');
    expect(await findAccessibilityIssues(page)).toEqual([]);
  });

  test('is usable on a phone', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only check');
    await page.goto('/plan');

    // The step rail becomes a horizontal scroller rather than stacking.
    await expect(page.getByRole('navigation', { name: /request steps/i })).toBeVisible();

    // No horizontal page scroll — the classic mobile layout failure.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBe(false);
  });
});
