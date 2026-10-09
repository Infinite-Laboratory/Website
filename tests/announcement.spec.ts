import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { activeAnnouncement, type Announcement } from '../src/lib/announcement';

const KEY = 'lab-ann-dismissed';

for (const route of ['/', '/rules']) {
  test(`shows the strip right under the nav on ${route}`, async ({ page }) => {
    await page.goto(route);
    const ann = page.getByRole('status');
    await expect(ann).toBeVisible();
    await expect(ann).toContainText('Deepslate MC is in development');
    const nav = await page.locator('.site-nav').boundingBox();
    const box = await ann.boundingBox();
    expect(Math.abs(box!.y - (nav!.y + nav!.height))).toBeLessThan(2);
    expect(box!.width).toBeGreaterThan(page.viewportSize()!.width - 2);
    // yellow fill, dark text
    await expect(ann).toHaveCSS('background-color', 'rgb(247, 185, 40)');
    await expect(ann).toHaveCSS('color', 'rgb(11, 12, 14)');
    await expect(ann).toHaveCSS('text-align', 'center');
  });
}

test('links to Register and has a labelled dismiss button', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status').getByRole('link', { name: 'Sign up >' })).toHaveAttribute('href', '/register');
  await expect(page.getByRole('button', { name: 'Dismiss announcement' })).toBeVisible();
});

test('dismiss hides it and it stays hidden after a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Dismiss announcement' }).click();
  await expect(page.getByRole('status')).toBeHidden();
  await page.reload();
  await expect(page.getByRole('status')).toBeHidden();
  await page.goto('/rules');
  await expect(page.getByRole('status')).toBeHidden();
});

test('a different announcement id shows again after an older one was dismissed', async ({ page }) => {
  await page.addInitScript((k) => localStorage.setItem(k, 'some-older-announcement'), KEY);
  await page.goto('/');
  await expect(page.getByRole('status')).toBeVisible();
});

test('when browser storage fails the strip still shows and dismiss still hides it for the page', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
  });
  await page.goto('/');
  await expect(page.getByRole('status')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss announcement' }).click();
  await expect(page.getByRole('status')).toBeHidden();
});

test('is in the static HTML and readable with JavaScript off', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('Sign up for early access');
  await ctx.close();
});

test('the dismiss control is reachable and visibly focused by keyboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Dismiss announcement' }).focus();
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe('none');
});

test('does not cover the nav, and Home is not pushed or hidden', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Home' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Join Discord >' })).toBeVisible();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('the text wraps, the dismiss button stays at the right edge, and the menu opens on top', async ({ page }) => {
    await page.goto('/');
    const ann = page.getByRole('status');
    const x = page.getByRole('button', { name: 'Dismiss announcement' });
    const annBox = await ann.boundingBox();
    const xBox = await x.boundingBox();
    expect(xBox!.x + xBox!.width).toBeGreaterThan(annBox!.x + annBox!.width - 16);
    const text = await ann.locator('p').boundingBox();
    expect(text!.height).toBeGreaterThan(24); // wrapped onto more than one line
    expect(text!.x + text!.width).toBeLessThan(xBox!.x);

    await page.getByRole('button', { name: 'Menu' }).click();
    const link = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Home' });
    const l = await link.boundingBox();
    // The menu panel sits over the banner: the topmost element at the banner's position is inside the menu.
    const topIsMenu = await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('#site-menu'), { x: l!.x + 4, y: annBox!.y + 4 });
    expect(topIsMenu).toBe(true);
  });
});

test('a visitor cannot dismiss someone else’s announcement: only the matching id is stored', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Dismiss announcement' }).click();
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('2026-10-early-access');
});

test.describe('config', () => {
  const base: Announcement = { id: 'a', message: 'x', until: '2026-12-31T00:00:00Z' };
  test('hides after the end time', () => {
    expect(activeAnnouncement(base, new Date('2026-12-30T23:59:59Z'))).toBe(base);
    expect(activeAnnouncement(base, new Date('2026-12-31T00:00:00Z'))).toBeNull();
    expect(activeAnnouncement({ id: 'a', message: 'x' }, new Date('2099-01-01'))).not.toBeNull();
    expect(activeAnnouncement(null)).toBeNull();
  });

  test('with no announcement configured no strip and no empty gap are built', () => {
    execSync('npx astro build --outDir dist-off', { env: { ...process.env, LAB_ANNOUNCEMENT: 'off' }, stdio: 'pipe' });
    try {
      const html = readFileSync('dist-off/index.html', 'utf8');
      expect(html).not.toContain('class="ann"');
      expect(html).not.toContain('lab-ann-dismissed');
    } finally {
      rmSync('dist-off', { recursive: true, force: true });
    }
  });
});
