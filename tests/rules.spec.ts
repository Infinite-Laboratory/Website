import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { variantsBySlug, pick, formatDate } from '../src/lib/content';

test.describe('rules page', () => {
  test('lists numbered rules, each with a stable anchor', async ({ page }) => {
    await page.goto('/rules');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lab rules');
    const rules = page.locator('.rules h2');
    await expect(rules).toHaveCount(10);
    // Numbers come from a CSS counter (R-01, R-02, ...): every rule increments it, the list resets it.
    const css = await rules.evaluateAll((els) => els.map((e) => ({ inc: getComputedStyle(e).counterIncrement, label: getComputedStyle(e, '::before').content })));
    expect(css.every((c) => c.inc === 'rule 1')).toBe(true);
    expect(css.every((c) => c.label.includes('R-') && c.label.includes('counter(rule, decimal-leading-zero)'))).toBe(true);
    await expect(page.locator('.rules')).toHaveCSS('counter-reset', 'rule 0');
    const ids = await rules.evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toContain('be-a-good-fellow');
    expect(ids).toContain('technicians-are-players');
    expect(new Set(ids).size).toBe(10);
  });

  test('a Jump to link scrolls its rule into view', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto('/rules');
    await page.getByRole('navigation', { name: 'Main' }).waitFor();
    await page.locator('.jump').getByRole('link', { name: 'Respect privacy' }).click();
    await expect(page).toHaveURL(/#respect-privacy$/);
    const h = page.locator('#respect-privacy');
    await expect(h).toBeInViewport();
    expect((await h.boundingBox())!.y).toBeGreaterThan(60); // not hidden under the nav
  });

  test('opening a rule link directly lands on that rule', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 500 });
    await page.goto('/rules#no-exploiting-lag-or-crashes');
    await expect(page.locator('#no-exploiting-lag-or-crashes')).toBeInViewport();
  });

  test('every rule gets a link to itself', async ({ page }) => {
    await page.goto('/rules');
    const a = page.locator('#no-cheating .anchor');
    await expect(a).toHaveAttribute('href', '#no-cheating');
    await expect(a).toHaveAttribute('aria-label', /No cheating/);
  });

  test('shows when the rules were last updated', async ({ page }) => {
    await page.goto('/rules');
    const t = page.locator('time');
    await expect(t).toHaveText('Oct 08, 2026');
    await expect(t).toHaveAttribute('datetime', '2026-10-08');
  });

  test('states the Fellow and Technician roles and that Technicians play like everyone else', async ({ page }) => {
    await page.goto('/rules');
    const rail = page.getByRole('complementary', { name: 'About these rules' });
    await expect(rail).toContainText('Fellows are players and testers.');
    await expect(rail).toContainText('Technicians are staff who log in to play, not only to moderate.');
    await expect(page.locator('#technicians-are-players + p')).toContainText('same rules as everyone');
    await expect(page.getByText('What happens if you break a rule')).toBeVisible();
    await expect(page.getByText('Permanent ban')).toBeVisible();
  });

  test('marks the text as a draft until the studio gives the final wording', async ({ page }) => {
    await page.goto('/rules');
    await expect(page.getByRole('note')).toHaveText('Draft rules. Final wording comes from the studio.');
  });

  test('is readable with JavaScript off, and anchors still work', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 500 } });
    const page = await ctx.newPage();
    await page.goto('/rules');
    await expect(page.locator('.rules h2')).toHaveCount(10);
    await expect(page.locator('.jump a')).toHaveCount(10);
    await page.locator('.jump').getByRole('link', { name: 'Keep chat readable' }).click();
    await expect(page.locator('#keep-chat-readable')).toBeInViewport();
    await ctx.close();
  });

  test('on a phone the page has no sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/rules');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('content pipeline', () => {
  test('the rules are a single markdown file', () => {
    expect(readdirSync('src/content/rules')).toEqual(['rules.en.md']);
  });

  test('Thai and English variants share a slug', () => {
    const en = { data: { slug: 'rules', language: 'en' as const, order: 1 } };
    const th = { data: { slug: 'rules', language: 'th' as const, order: 1 } };
    const other = { data: { slug: 'wiki', language: 'en' as const, order: 2 } };
    const map = variantsBySlug([en, th, other]);
    expect([...map.keys()]).toEqual(['rules', 'wiki']);
    expect(map.get('rules')).toEqual({ en, th });
  });

  test('a missing translation falls back to English', () => {
    const en = { data: { slug: 'rules', language: 'en' as const, order: 1 } };
    const v = variantsBySlug([en]).get('rules');
    expect(pick(v, 'th')).toBe(en);
    expect(pick(v, 'en')).toBe(en);
    expect(pick(undefined, 'en')).toBeUndefined();
  });

  test('dates are formatted in UTC so the day never shifts', () => {
    expect(formatDate(new Date('2026-10-08'))).toBe('Oct 08, 2026');
    expect(formatDate(new Date('2026-01-01T00:00:00Z'))).toBe('Jan 01, 2026');
  });
});
