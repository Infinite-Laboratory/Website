import { test, expect } from '@playwright/test';
import { latest, newestFirst, type LogItem } from '../src/lib/buildlog';

const item = (date: string, title: string, kind: 'Added' | 'Changed' | 'Fixed' | 'Removed' = 'Added'): LogItem => ({
  data: { date: new Date(date), kind, title, language: 'en' },
});

test.describe('build log page', () => {
  test('lists every entry newest first, each with a kind tag, date and text', async ({ page }) => {
    await page.goto('/build-log');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('What changed');
    const posts = page.locator('.post');
    expect(await posts.count()).toBeGreaterThanOrEqual(4);
    const dates = await posts.locator('time').evaluateAll((els) => els.map((e) => e.getAttribute('datetime')!));
    expect([...dates].sort().reverse()).toEqual(dates);
    const kinds = await posts.locator('.tag').evaluateAll((els) => els.map((e) => e.textContent));
    for (const k of kinds) expect(['Added', 'Changed', 'Fixed', 'Removed']).toContain(k);
    for (let i = 0; i < (await posts.count()); i++) {
      await expect(posts.nth(i).locator('h3 span').last()).not.toBeEmpty();
      await expect(posts.nth(i).locator('.body p')).not.toBeEmpty();
    }
  });

  test('ships no invented game updates: every entry is a real website change', async ({ page }) => {
    await page.goto('/build-log');
    const titles = await page.locator('.post h3').allInnerTexts();
    for (const t of titles) expect(t).toMatch(/Website/);
    expect(await page.locator('main').innerText()).not.toMatch(/sample|lorem|v0\.1/i);
  });

  test('is linked from the footer', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Build log' })).toHaveAttribute('href', '/build-log');
  });
});

test.describe('Home summary', () => {
  test('shows the latest three entries and a link to the full page', async ({ page }) => {
    await page.goto('/');
    const box = page.locator('#log-title').locator('xpath=ancestor::section');
    await expect(box.locator('.post')).toHaveCount(3);
    const homeDates = await box.locator('time').evaluateAll((els) => els.map((e) => e.getAttribute('datetime')!));
    await page.goto('/build-log');
    const allDates = await page.locator('.post time').evaluateAll((els) => els.map((e) => e.getAttribute('datetime')!));
    expect(homeDates).toEqual(allDates.slice(0, 3));
    await page.goto('/');
    await page.getByRole('link', { name: 'View full build log >' }).click();
    await expect(page).toHaveURL(/\/build-log$/);
  });

  test('is readable with JavaScript off', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('#log-title')).toBeVisible();
    await expect(page.locator('.post').first()).toBeVisible();
    await ctx.close();
  });
});

test.describe('ordering helpers', () => {
  test('newest first, and latest(n) takes the first n', () => {
    const a = item('2026-10-01', 'a'), b = item('2026-10-08', 'b'), c = item('2026-10-05', 'c'), d = item('2026-10-09', 'd');
    expect(newestFirst([a, b, c, d]).map((i) => i.data.title)).toEqual(['d', 'b', 'c', 'a']);
    expect(latest([a, b, c, d], 3).map((i) => i.data.title)).toEqual(['d', 'b', 'c']);
    expect(latest([a], 3)).toHaveLength(1);
    expect(latest([], 3)).toEqual([]);
  });

  test('does not mutate its input', () => {
    const items = [item('2026-10-01', 'a'), item('2026-10-09', 'b')];
    newestFirst(items);
    expect(items.map((i) => i.data.title)).toEqual(['a', 'b']);
  });
});
