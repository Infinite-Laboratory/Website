import { test, expect } from '@playwright/test';
import { buildAndServe, contentWithThaiFixtures, type StaticSite } from './helpers/static-site';
import { splitLanguage, localizedRoute } from '../src/lib/i18n';

test.describe('language switch with no Thai copy yet (what ships today)', () => {
  test('shows English as current and Thai as not translated, never a dead link', async ({ page }) => {
    await page.goto('/rules');
    const sw = page.getByRole('navigation', { name: 'Language' });
    await expect(sw.locator('[lang="en"]')).toHaveAttribute('aria-current', 'true');
    const th = sw.locator('[lang="th"]');
    await expect(th).toHaveText('ไทย');
    await expect(th).toHaveAttribute('aria-disabled', 'true');
    await expect(th).toHaveAttribute('title', 'Not translated yet');
    await expect(sw.getByRole('link')).toHaveCount(0);
  });

  test('no Thai pages are published, and no hreflang alternates are advertised', async ({ request, page }) => {
    expect((await request.get('/th/rules')).status()).toBe(404);
    expect((await request.get('/th/wiki/technicians-play-here')).status()).toBe(404);
    await page.goto('/rules');
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test.describe('language switch with Thai pages', () => {
  test.describe.configure({ mode: 'serial' });
  let site: StaticSite;
  test.beforeAll(async () => {
    const dir = contentWithThaiFixtures('tmp-content-th');
    try {
      site = await buildAndServe('dist-th', { LAB_CONTENT_DIR: `./${dir}`, LAB_CACHE_DIR: './tmp-cache-th' });
    } finally {
      const { rmSync } = await import('node:fs');
      rmSync(dir, { recursive: true, force: true });
      rmSync('tmp-cache-th', { recursive: true, force: true });
    }
  });
  test.afterAll(() => site?.close());

  test('the switch moves between the Thai and English variants of the same page', async ({ page }) => {
    await page.goto(site.url('/rules'));
    const sw = page.getByRole('navigation', { name: 'Language' });
    await sw.getByRole('link', { name: 'ไทย' }).click();
    await expect(page).toHaveURL(/\/th\/rules$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('กฎของห้องแล็บ (ทดสอบ)');
    await expect(page.locator('html')).toHaveAttribute('lang', 'th');
    await page.getByRole('navigation', { name: 'Language' }).getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/rules$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lab rules');
  });

  test('wiki articles switch too, and pages without a Thai variant stay English-only', async ({ page }) => {
    await page.goto(site.url('/wiki/technicians-play-here'));
    await page.getByRole('navigation', { name: 'Language' }).getByRole('link', { name: 'ไทย' }).click();
    await expect(page).toHaveURL(/\/th\/wiki\/technicians-play-here$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ช่างเทคนิคเล่นที่นี่ (ทดสอบ)');
    await page.goto(site.url('/wiki/armored-smp-lessons'));
    await expect(page.getByRole('navigation', { name: 'Language' }).locator('[lang="th"]')).toHaveAttribute('aria-disabled', 'true');
  });

  test('Thai text renders in IBM Plex Sans Thai', async ({ page }) => {
    await page.goto(site.url('/th/rules'));
    const family = await page.locator('h1').evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family.split(',')[0]!.replace(/["']/g, '').trim()).toBe('IBM Plex Sans Thai');
    const loaded = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].some((f) => f.family.includes('IBM Plex Sans Thai') && f.status === 'loaded'); });
    expect(loaded).toBe(true);
  });

  test('the brand name is never translated and the nav stays usable on Thai pages', async ({ page }) => {
    await page.goto(site.url('/th/rules'));
    await expect(page.locator('header .wordmark')).toHaveText('Infinite Laboratory');
    await expect(page.getByRole('contentinfo')).toContainText('Infinite Laboratory');
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link')).toHaveCount(6);
    await expect(page).toHaveTitle(/Infinite Laboratory$/);
  });

  test('both variants advertise each other with hreflang and keep their own canonical', async ({ page }) => {
    await page.goto(site.url('/rules'));
    await expect(page.locator('link[rel="alternate"][hreflang="th"]')).toHaveAttribute('href', /\/th\/rules$/);
    await page.goto(site.url('/th/rules'));
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', /\/rules$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/th\/rules$/);
  });

  test('Thai page headings keep working anchors', async ({ page }) => {
    await page.goto(site.url('/th/rules'));
    expect(await page.locator('.rules h2').count()).toBe(2);
    expect(await page.locator('.rules h2').first().getAttribute('id')).toBeTruthy();
  });
});

test.describe('language helpers', () => {
  test('split and join routes', () => {
    expect(splitLanguage('/th/rules')).toEqual({ lang: 'th', route: '/rules' });
    expect(splitLanguage('/th')).toEqual({ lang: 'th', route: '/' });
    expect(splitLanguage('/rules')).toEqual({ lang: 'en', route: '/rules' });
    expect(splitLanguage('/thanks')).toEqual({ lang: 'en', route: '/thanks' });
    expect(localizedRoute('/rules', 'th')).toBe('/th/rules');
    expect(localizedRoute('/', 'th')).toBe('/th');
    expect(localizedRoute('/rules', 'en')).toBe('/rules');
  });
});
