import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { BRAND_GROUPS } from '../src/data/brand';
import { humanSize } from '../src/lib/files';

const walk = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const CONTENT_TYPES: Record<string, RegExp> = { '.svg': /svg/, '.png': /png/, '.gif': /gif/, '.mp4': /mp4/, '.webm': /webm/, '.ico': /icon|octet/ };

test.describe('brand kit page', () => {
  test('lists every group, with a preview, title, type, size and download link per file', async ({ page }) => {
    await page.goto('/brand');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Use the real files');
    for (const g of BRAND_GROUPS) await expect(page.locator(`#${g.id}`)).toBeVisible();
    const assets = page.locator('.asset');
    expect(await assets.count()).toBe(BRAND_GROUPS.flatMap((g) => g.assets).length);
    const first = assets.first();
    await expect(first.locator('img')).toHaveAttribute('alt', /.+/);
    await expect(first.locator('h3')).not.toBeEmpty();
    await expect(first.locator('.files li').first().locator('.type')).not.toBeEmpty();
    await expect(first.locator('.files li').first().locator('.size')).toHaveText(/\d+(\.\d)? (B|KB|MB)/);
  });

  test('every download works, has the right type, and the size shown matches the file', async ({ page, request }) => {
    await page.goto('/brand');
    const links = await page.locator('.files a').evaluateAll((as) => as.map((a) => ({ href: a.getAttribute('href')!, size: a.querySelector('.size')!.textContent!, download: a.hasAttribute('download') })));
    expect(links.length).toBeGreaterThan(50);
    for (const l of links) {
      expect(l.download, l.href).toBe(true);
      const res = await request.get(l.href);
      expect(res.status(), l.href).toBe(200);
      const body = await res.body();
      expect(body.length, l.href).toBeGreaterThan(100);
      expect(humanSize(body.length), l.href).toBe(l.size);
      const ct = res.headers()['content-type'] ?? '';
      const want = CONTENT_TYPES[extname(l.href)];
      if (want) expect(ct, l.href).toMatch(want);
    }
  });

  test('does not embed the large animated banner; it is a download only', async ({ page }) => {
    await page.goto('/brand');
    await expect(page.locator('img[src*="animated"]')).toHaveCount(0);
    await expect(page.locator('video')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /GIF, animated/ })).toHaveAttribute('href', /banner-960x540-animated\.gif$/);
    await expect(page.locator('#banner, [data-asset="banner"]').first()).toContainText('download only');
  });

  test('shows colors with their hex codes, the fonts, and the use and do-not-use note', async ({ page }) => {
    await page.goto('/brand');
    await expect(page.locator('#colors')).toContainText('#7AA7FB');
    await expect(page.locator('#colors')).toContainText('#9BFBA2');
    await expect(page.locator('#colors')).toContainText('#0B0C0E');
    await expect(page.locator('#fonts')).toContainText('Geist Mono');
    await expect(page.locator('#fonts')).toContainText('IBM Plex Sans Thai');
    await expect(page.locator('#using')).toContainText('Do not');
    await expect(page.getByRole('heading', { name: 'How to spot the real us' })).toBeVisible();
    await expect(page.locator('#using').getByRole('link', { name: 'discord.gg/FQe3Mt6nA' })).toHaveAttribute('href', 'https://discord.gg/FQe3Mt6nA');
  });

  test('is linked from the footer and works with JavaScript off', async ({ page, browser }) => {
    await page.goto('/');
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Brand kit' })).toHaveAttribute('href', '/brand');
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const p = await ctx.newPage();
    await p.goto('/brand');
    await expect(p.locator('.files a').first()).toBeVisible();
    await ctx.close();
  });
});

test.describe('what is published under /brand', () => {
  const files = walk('public/brand');

  test('only finished files: no sources, drafts, generators or other junk', () => {
    const allowed = new Set(['.svg', '.png', '.gif', '.mp4', '.webm', '.ico']);
    for (const f of files) expect(allowed.has(extname(f)), f).toBe(true);
    for (const f of files) expect(f, f).not.toMatch(/draft|source|\.(ai|psd|fig|sketch|py|sh|html|json|zip)$/i);
  });

  test('every published file is listed on the page, and every listed file exists', () => {
    const listed = new Set(BRAND_GROUPS.flatMap((g) => g.assets.flatMap((a) => a.files.map((f) => `public${f.path}`))));
    for (const f of files) expect(listed.has(f), `${f} is published but not listed`).toBe(true);
    for (const f of listed) expect(files, `${f} is listed but missing`).toContain(f);
  });

  test('includes no Minecraft or Mojang marks', () => {
    for (const f of files) expect(f.toLowerCase(), f).not.toMatch(/minecraft|mojang|creeper|grass-block/);
    for (const g of BRAND_GROUPS) for (const a of g.assets) expect(`${a.title} ${a.note}`.toLowerCase().replace('not an official minecraft', ''), a.id).not.toMatch(/mojang logo|minecraft logo/);
  });

  test('PNGs carry no text or EXIF metadata, and SVGs carry no comments or metadata', () => {
    for (const f of files.filter((x) => x.endsWith('.png'))) {
      const d = readFileSync(f);
      for (const t of ['tEXt', 'iTXt', 'zTXt', 'eXIf', 'tIME']) expect(d.includes(Buffer.from(t)), `${f} has ${t}`).toBe(false);
    }
    for (const f of files.filter((x) => x.endsWith('.svg'))) {
      const s = readFileSync(f, 'utf8');
      expect(s, f).not.toMatch(/<!--|<metadata|<\?xml|<title>/);
      expect(s, f).not.toMatch(/\/Users\/|inkscape|illustrator/i);
    }
  });
});

test.describe('size formatting', () => {
  test('bytes, kilobytes and megabytes', () => {
    expect(humanSize(512)).toBe('512 B');
    expect(humanSize(1024)).toBe('1 KB');
    expect(humanSize(15759)).toBe('15 KB');
    expect(humanSize(1235637)).toBe('1.2 MB');
  });
});
