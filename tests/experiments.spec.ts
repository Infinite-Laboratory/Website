import { test, expect } from '@playwright/test';
import { buildAndServe, type StaticSite } from './helpers/static-site';
import { pingBars } from '../src/lib/server-status';
import { EXPERIMENTS, legacyExperiments } from '../src/data/experiments';

test.describe('list while Deepslate MC is in development', () => {
  test('lists only real experiments, current ones first', async ({ page }) => {
    await page.goto('/');
    const names = await page.locator('.srow .sname').allInnerTexts();
    expect(names.map((n) => n.replace(/\s+/g, ' ').trim())).toEqual(['Deepslate MC EXP-002', 'Armored SMP EXP-001 Archived']);
    expect(EXPERIMENTS.map((e) => e.id)).toEqual(['deepslate-mc', 'armored-smp']);
  });

  test('Deepslate MC shows In development, its MOTD and versions, and no fake count or address', async ({ page }) => {
    await page.goto('/');
    const row = page.locator('[data-experiment="deepslate-mc"]');
    await expect(row).toContainText('In development');
    await expect(row).toContainText('INFINITE');
    await expect(row).toContainText('LABORATORY');
    await expect(row).toContainText('Deepslate economy');
    await expect(row).toContainText('Java 1.21 · Bedrock');
    await expect(row).toContainText('Address at launch');
    await expect(row.locator('.ping')).toHaveCount(0);
    expect(await row.innerText()).not.toMatch(/\d+\s*\/\s*\d+/);
  });

  test('legacy servers are hidden behind a toggle that reads Show then Hide', async ({ page }) => {
    await page.goto('/');
    const legacy = page.locator('[data-experiment="armored-smp"]');
    const btn = page.getByRole('button', { name: /legacy servers/ });
    await expect(legacy).toBeHidden();
    await expect(btn).toHaveText(/Show legacy servers \(1\)/);
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await btn.click();
    await expect(legacy).toBeVisible();
    await expect(btn).toHaveText(/Hide legacy servers/);
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await btn.click();
    await expect(legacy).toBeHidden();
    await expect(btn).toHaveText(/Show legacy servers \(1\)/);
    expect(legacyExperiments()).toHaveLength(1);
  });

  test('Armored SMP is dimmed, Archived, has no address, and its lessons link resolves', async ({ page, request }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /legacy servers/ }).click();
    const row = page.locator('[data-experiment="armored-smp"]');
    await expect(row).toContainText('Archived');
    await expect(row).toContainText('Ran 3 months');
    await expect(row).toContainText('Java 1.19.4 · Whitelist');
    await expect(row).toContainText('went offline for good');
    await expect(row.locator('.ad')).toHaveCount(0);
    expect(await row.locator('.sname').evaluate((el) => Number(getComputedStyle(el).opacity))).toBeLessThan(1);
    const lessons = row.getByRole('link', { name: 'Read what we learned >' });
    const href = (await lessons.getAttribute('href'))!;
    expect((await request.get(href)).status()).toBe(200);
    await lessons.click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('What we learned from Armored SMP');
  });

  test('without JavaScript the legacy server is simply shown', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('[data-experiment="armored-smp"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /legacy servers/ })).toBeHidden();
    await ctx.close();
  });

  test('the first row is on the first screen next to the hero', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const box = (await page.locator('[data-experiment="deepslate-mc"]').boundingBox())!;
    expect(box.y + box.height).toBeLessThan(900);
  });
});

test.describe('list when Deepslate MC is live', () => {
  test.describe.configure({ mode: 'serial' });
  let site: StaticSite;
  test.beforeAll(async () => {
    site = await buildAndServe('dist-live', { LAB_DEEPSLATE_LIVE: '1', LAB_SERVER_ADDRESS: 'play.example.test' });
  });
  test.afterAll(() => site?.close());

  test('shows the players the status source reports, and the address', async ({ page }) => {
    await page.route('https://api.mcsrvstat.us/**', (r) =>
      r.fulfill({ json: { online: true, players: { online: 12, max: 100 } }, headers: { 'access-control-allow-origin': '*' } }));
    await page.goto(site.url('/'));
    const row = page.locator('[data-experiment="deepslate-mc"]');
    await expect(row.locator('.status-text')).toHaveText('12 / 100 fellows');
    await expect(row).toContainText('play.example.test');
    await expect(row).not.toContainText('In development');
    await expect(row).not.toContainText('Address at launch');
  });

  test('shows "Status unavailable" and no number when the source fails', async ({ page }) => {
    await page.route('https://api.mcsrvstat.us/**', (r) => r.abort());
    await page.goto(site.url('/'));
    const row = page.locator('[data-experiment="deepslate-mc"]');
    await expect(row.locator('.status-text')).toHaveText('Status unavailable');
    expect(await row.innerText()).not.toMatch(/\d+\s*\/\s*\d+/);
    await expect(row).toContainText('play.example.test');
  });

  test('shows "Status unavailable" when the server answers but is offline', async ({ page }) => {
    await page.route('https://api.mcsrvstat.us/**', (r) =>
      r.fulfill({ json: { online: false }, headers: { 'access-control-allow-origin': '*' } }));
    await page.goto(site.url('/'));
    await expect(page.locator('.status-text')).toHaveText('Status unavailable');
  });
});

test('ping bars map latency to 1-4 bars', () => {
  expect([20, 59, 60, 119, 120, 199, 200, 900].map(pingBars)).toEqual([4, 4, 3, 3, 2, 2, 1, 1]);
});
