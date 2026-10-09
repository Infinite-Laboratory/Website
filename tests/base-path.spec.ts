import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildAndServe, type StaticSite } from './helpers/static-site';

// GitHub Pages serves a project site under /<repo>/. Build that way and check it end to end.
const BASE = '/Website';
const ORIGIN = 'https://infinite-laboratory.github.io';
const OUT = 'dist-base';

// One build and one server for the whole file: run these tests together in a single worker.
test.describe.configure({ mode: 'serial' });

let site: StaticSite;

test.beforeAll(async () => {
  site = await buildAndServe(OUT, { BASE_PATH: BASE, SITE_URL: ORIGIN }, BASE);
});

test.afterAll(() => site?.close());

const url = (p: string) => site.url(p);

test('every internal link, icon and asset in the built HTML is under the base', () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
  const pages = walk(OUT).filter((f) => f.endsWith('.html'));
  expect(pages.length).toBeGreaterThan(10);
  for (const f of pages) {
    const html = readFileSync(f, 'utf8');
    const bad = [...html.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map((m) => m[1]!).filter((u) => !u.startsWith('//') && u !== BASE && !u.startsWith(`${BASE}/`));
    expect(bad, f).toEqual([]);
    const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1] ?? '';
    expect(canonical.startsWith(`${ORIGIN}${BASE}`), `${f} canonical ${canonical}`).toBe(true);
  }
});

test('the home page and a nested page load with styles and the right nav state', async ({ page }) => {
  await page.goto(url('/'));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(11, 12, 14)');
  await expect(page.locator('[aria-current="page"]')).toHaveText('Home');
  await page.goto(url('/rules'));
  await expect(page.locator('[aria-current="page"]')).toHaveText('Rules');
  await expect(page).toHaveTitle('Rules · Infinite Laboratory');
});

test('nav, footer and announcement links stay under the base and resolve', async ({ page, request }) => {
  await page.goto(url('/'));
  const hrefs = await page.locator('header a[href^="/"], footer a[href^="/"], .ann a[href^="/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')!))]);
  expect(hrefs.length).toBeGreaterThan(8);
  for (const h of hrefs) {
    expect(h.startsWith(`${BASE}/`) || h === BASE, h).toBe(true);
    expect((await request.get(new URL(h, site.url('/')).href)).status(), h).toBe(200);
  }
});

test('the logo click goes to the home page under the base, and scrolls to the top when already there', async ({ page }) => {
  await page.goto(url('/rules'));
  await page.locator('header [data-logo]').click();
  await page.waitForURL((u) => u.pathname === `${BASE}/` || u.pathname === BASE);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.evaluate(() => { document.body.style.minHeight = '3000px'; (window as any).__same = true; window.scrollTo(0, 800); });
  await page.locator('footer [data-logo]').scrollIntoViewIfNeeded();
  await page.locator('footer [data-logo]').click();
  await page.waitForFunction(() => window.scrollY < 2);
  expect(await page.evaluate(() => (window as any).__same)).toBe(true);
});

test('the 404 page links home and to the wiki under the base', async ({ page }) => {
  const res = await page.goto(url('/nope'));
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('link', { name: 'Back to the lab' })).toHaveAttribute('href', `${BASE}/`);
  await expect(page.getByRole('link', { name: 'Read the wiki' })).toHaveAttribute('href', `${BASE}/wiki`);
});

test('icons and the social image are reachable under the base', async ({ request }) => {
  for (const p of ['/favicon.ico', '/favicon-32.png', '/assets/og.png']) expect((await request.get(url(p))).status(), p).toBe(200);
});
