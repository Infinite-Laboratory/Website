import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

// GitHub Pages serves a project site under /<repo>/. Build that way and check it end to end.
const BASE = '/Website';
const ORIGIN = 'https://infinite-laboratory.github.io';
const OUT = 'dist-base';
const TYPES: Record<string, string> = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff' };

// One build and one server for the whole file: run these tests together in a single worker.
test.describe.configure({ mode: 'serial' });

let server: Server;
let PORT = 0; // picked by the OS so a leftover server can never answer for us

test.beforeAll(async () => {
  execSync(`npx astro build --outDir ${OUT}`, { env: { ...process.env, BASE_PATH: BASE, SITE_URL: ORIGIN }, stdio: 'pipe' });
  // Mimic GitHub Pages: files under /Website/, extensionless URLs fall back to .html, 404.html for the rest.
  server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    const send = (file: string, status = 200) => {
      res.writeHead(status, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(readFileSync(file));
    };
    if (!url.pathname.startsWith(BASE)) return send(join(OUT, '404.html'), 404);
    let rel = url.pathname.slice(BASE.length).replace(/^\//, '');
    const tryFiles = [rel, `${rel}.html`, join(rel, 'index.html')].filter((f) => f !== '');
    if (rel === '') tryFiles.unshift('index.html');
    for (const f of tryFiles) {
      const p = join(OUT, f);
      if (existsSync(p) && statSync(p).isFile()) return send(p);
    }
    send(join(OUT, '404.html'), 404);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  PORT = (server.address() as AddressInfo).port;
});

test.afterAll(() => {
  server?.close();
  rmSync(OUT, { recursive: true, force: true });
});

const url = (p: string) => `http://127.0.0.1:${PORT}${BASE}${p}`;

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
    expect((await request.get(`http://127.0.0.1:${PORT}${h}`)).status(), h).toBe(200);
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
