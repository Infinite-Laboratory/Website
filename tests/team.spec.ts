import { test, expect } from '@playwright/test';
import { rmSync } from 'node:fs';
import { buildAndServe, contentWith, type StaticSite } from './helpers/static-site';
import { faceDataUri } from '../src/lib/face';

test.describe('Our team page', () => {
  test('shows each member with name, role and in-game name', async ({ page }) => {
    await page.goto('/team');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Who builds this');
    await expect(page.getByText('The team plays in the same world, under the same rules as everyone.')).toBeVisible();
    const pinont = page.locator('[data-member="pinont"]');
    await expect(pinont.getByRole('heading')).toContainText('Pinont');
    await expect(pinont).toContainText('Founder');
    await expect(pinont.locator('.ign')).toHaveText(/pinont_/);
    const pause = page.locator('[data-member="pause"]');
    await expect(pause).toContainText('Pause');
    await expect(pause).toContainText('Co-Founder');
    await expect(pause.locator('.ign')).toHaveText(/cObsidian/);
  });

  test('invents no descriptions or links for members who have not supplied them', async ({ page }) => {
    await page.goto('/team');
    await expect(page.locator('.member .site')).toHaveCount(0);
    expect(await page.locator('.member p:not(.ign-soon)').count()).toBe(0);
  });

  test('a click copies the in-game name and shows Copied', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/team');
    await page.locator('[data-member="pause"] .ign').click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('cObsidian');
    await expect(page.locator('[data-member="pause"] .ign em')).toBeVisible();
    await expect(page.locator('[data-member="pause"] .ign em')).toBeHidden({ timeout: 3000 });
  });

  test('shows the goggles with black lenses when no face is available', async ({ page }) => {
    await page.goto('/team'); // the test build has faces switched off
    const face = page.locator('[data-member="pinont"] .face');
    await expect(face.locator('svg.goggles')).toBeVisible();
    await expect(face.locator('img')).toHaveCount(0);
    // the lens glass is near black, not the normal blue and mint
    const lens = await face.locator('rect.lp').first().getAttribute('fill');
    expect(lens).toMatch(/^#[0-3][0-9a-f][0-3][0-9a-f][0-3][0-9a-f]$/);
  });

  test('is linked from the footer and not from the main nav', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Our team' })).toHaveAttribute('href', '/team');
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /team/i })).toHaveCount(0);
  });

  test('is readable with JavaScript off', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/team');
    await expect(page.locator('[data-member="pinont"]')).toContainText('pinont_');
    await ctx.close();
  });
});

test.describe('a member with no in-game name and a website', () => {
  test.describe.configure({ mode: 'serial' });
  let site: StaticSite;
  test.beforeAll(async () => {
    const dir = contentWith('tmp-content-team', { 'team/extra.en.md': 'tests/fixtures/team/extra.en.md' });
    try {
      site = await buildAndServe('dist-team', { LAB_CONTENT_DIR: `./${dir}`, LAB_CACHE_DIR: './tmp-cache-team', LAB_FACES: 'off' });
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync('tmp-cache-team', { recursive: true, force: true });
    }
  });
  test.afterAll(() => site?.close());

  test('shows "In-game name coming soon" and the goggles, and a safe website link', async ({ page }) => {
    await page.goto(site.url('/team'));
    const m = page.locator('[data-member="test-member"]');
    await expect(m.locator('.ign-soon')).toHaveText('In-game name coming soon');
    await expect(m.locator('svg.goggles')).toBeVisible();
    const link = m.getByRole('link', { name: 'Example site >' });
    await expect(link).toHaveAttribute('href', 'https://example.test/me');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener nofollow');
  });
});

test.describe('face fetching', () => {
  const realFetch = globalThis.fetch;
  test.afterEach(() => {
    globalThis.fetch = realFetch;
    rmSync('.cache/faces/facetest.png', { force: true });
  });

  test('rejects names that are not valid in-game names without any request', async () => {
    let called = false;
    globalThis.fetch = (async () => { called = true; return new Response(); }) as typeof fetch;
    expect(await faceDataUri('../etc/passwd')).toBeNull();
    expect(await faceDataUri('has space')).toBeNull();
    expect(await faceDataUri(undefined)).toBeNull();
    expect(called).toBe(false);
  });

  test('returns a data URI for a PNG, and falls back to null on failure or a wrong type', async () => {
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    globalThis.fetch = (async () => new Response(png, { headers: { 'content-type': 'image/png' } })) as typeof fetch;
    const uri = await faceDataUri('facetest');
    expect(uri).toMatch(/^data:image\/png;base64,/);
    rmSync('.cache/faces/facetest.png', { force: true });
    globalThis.fetch = (async () => new Response('<html>', { headers: { 'content-type': 'text/html' } })) as typeof fetch;
    expect(await faceDataUri('facetest')).toBeNull();
    globalThis.fetch = (async () => { throw new Error('offline'); }) as typeof fetch;
    expect(await faceDataUri('facetest')).toBeNull();
  });
});
