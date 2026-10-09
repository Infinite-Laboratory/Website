import { test, expect } from '@playwright/test';
import { buildAndServe, type StaticSite } from './helpers/static-site';

test.describe('hero', () => {
  test('says what the server is, in one sentence', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('You are Fellow ∞');
    await expect(page.getByText('A community-driven, cross-platform Minecraft server.')).toBeVisible();
    await expect(page.getByText('Java and Bedrock')).toBeVisible();
    await expect(page.getByText('Experiment 002 · Deepslate MC')).toBeVisible();
  });

  test('has one Join Discord button that opens the invite in a new tab', async ({ page }) => {
    await page.goto('/');
    const join = page.getByRole('link', { name: 'Join Discord >' });
    await expect(join).toHaveCount(1);
    await expect(join).toHaveAttribute('href', 'https://discord.gg/FQe3Mt6nA');
    await expect(join).toHaveAttribute('target', '_blank');
    await expect(join).toHaveAttribute('rel', /noopener/);
  });

  test('shows Backed by SingularityLib and a Send feedback link', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Backed by')).toBeVisible();
    await expect(page.locator('.backed').getByRole('link', { name: 'SingularityLib' })).toHaveAttribute('href', 'https://github.com/Pinont/SingularityLib');
    const fb = page.getByRole('link', { name: 'Send feedback >' });
    await expect(fb).toHaveAttribute('href', 'https://discord.gg/FQe3Mt6nA');
    await expect(fb).toHaveAttribute('target', '_blank');
  });

  test('shows "Opening soon" and no fake address while Deepslate is in development', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero-addr')).toContainText('Opening soon');
    await expect(page.locator('.addr-copy')).toHaveCount(0);
    expect(await page.locator('.hero').innerText()).not.toMatch(/example-domain|play\./i);
  });

  test('is about half the viewport tall, so the next section can show on the first screen', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    const h = (await page.locator('.hero').boundingBox())!.height;
    expect(h).toBeGreaterThanOrEqual(500);
    expect(h).toBeLessThanOrEqual(501);
    await page.setViewportSize({ width: 1440, height: 1400 });
    expect((await page.locator('.hero').boundingBox())!.height).toBeCloseTo(700, 0);
  });

  test('draws the aurora and the pixel bubbles behind the text, and fades them out before the hero ends', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.aurora')).toBeVisible();
    await expect(page.locator('.lbub-root')).toBeAttached();
    await expect(page.locator('.hero-fx')).toHaveAttribute('aria-hidden', 'true');
    const mask = await page.locator('.hero-fx').evaluate((el) => getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage);
    expect(mask).toContain('linear-gradient');
    expect(mask).toMatch(/rgba\(0, 0, 0, 0\) 100%/);
  });

  test('keeps the bubbles off the headline and the copy block', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForTimeout(300);
    const copy = (await page.locator('.hero-copy').boundingBox())!;
    const bubbles = await page.locator('.lbub-root .lbub-b').evaluateAll((els) =>
      els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
    expect(bubbles.length).toBeGreaterThan(0);
    for (const b of bubbles) {
      const overlaps = b.x < copy.x + copy.width && b.x + b.w > copy.x && b.y < copy.y + copy.height && b.y + b.h > copy.y;
      expect(overlaps, JSON.stringify(b)).toBe(false);
    }
  });

  test('with reduced motion the bubbles are hidden and the aurora does not drift', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('.lbub-root')).toBeHidden();
    await expect(page.locator('.aurora')).toHaveCSS('animation-name', 'none');
  });

  test('is readable with JavaScript off', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('A community-driven, cross-platform Minecraft server.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Join Discord >' })).toBeVisible();
    await ctx.close();
  });

  test('on a phone the copy and the side block do not overlap', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    const copy = (await page.locator('.hero-copy').boundingBox())!;
    const side = (await page.locator('.hero-side').boundingBox())!;
    expect(copy.y + copy.height).toBeLessThanOrEqual(side.y + 1);
  });

  test('on a phone the announcement strip does not cover the hero copy', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    const ann = (await page.locator('.ann').boundingBox())!;
    const copy = (await page.locator('.hero-copy').boundingBox())!;
    expect(copy.y).toBeGreaterThanOrEqual(ann.y + ann.height);
  });
});

test.describe('address block with a configured address', () => {
  test.describe.configure({ mode: 'serial' });
  let site: StaticSite;
  test.beforeAll(async () => {
    site = await buildAndServe('dist-addr', { LAB_SERVER_ADDRESS: 'play.example.test' });
  });
  test.afterAll(() => site?.close());

  test('shows the address with a cursor right after it, selectable as text', async ({ page }) => {
    await page.goto(site.url('/'));
    const text = page.locator('.addr-text');
    await expect(text).toHaveText('play.example.test');
    await expect(page.locator('.addr-copy .cursor')).toBeVisible();
    const t = (await text.boundingBox())!;
    const c = (await page.locator('.addr-copy .cursor').boundingBox())!;
    expect(c.x - (t.x + t.width)).toBeLessThanOrEqual(3);
    await expect(page.locator('.addr-copy .ad')).toHaveCSS('user-select', 'text');
  });

  test('a click copies the address and shows a glowing COPIED that then clears', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(site.url('/')).origin });
    await page.goto(site.url('/'));
    await page.locator('.addr-copy').click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('play.example.test');
    const copied = page.locator('.addr-copy .copied');
    await expect(copied).toBeVisible();
    await expect(copied).toHaveText('copied');
    await expect(copied).toHaveCSS('color', 'rgb(155, 251, 162)');
    await expect(copied).toBeHidden({ timeout: 3000 });
    await expect(page.locator('.addr-text')).toBeVisible();
  });

  test('when the clipboard is blocked the click still shows feedback and the address stays selectable', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) } });
    });
    await page.goto(site.url('/'));
    await page.locator('.addr-copy').click();
    await expect(page.locator('.addr-copy .copied')).toBeVisible();
    await expect(page.locator('.addr-copy .ad')).toHaveCSS('user-select', 'text');
  });

  test('the hero no longer says Opening soon', async ({ page }) => {
    await page.goto(site.url('/'));
    await expect(page.locator('.hero-addr')).not.toContainText('Opening soon');
  });
});
