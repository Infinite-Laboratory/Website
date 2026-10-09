import { test, expect, type Page } from '@playwright/test';

const LENS_CENTER = '.goggles rect[x="8"][y="5"]'; // top-lens interior, not a glint
const LENS_LIGHT_ROW = '.goggles rect[x="8"][y="8"]';
const LENS_BASE_ROW = '.goggles rect[x="8"][y="9"]';
const FRAME_PIXEL = '.goggles rect[x="4"][y="2"]'; // frame is unchanged by the flash
const OUTLINE_PIXEL = '.goggles rect[x="3"][y="1"]';

const fill = (page: Page, sel: string, scope: string) =>
  page.locator(`${scope} ${sel}`).first().evaluate((el) => getComputedStyle(el).fill);

for (const [name, scope] of [['nav', 'header'], ['footer', 'footer']] as const) {
  test.describe(`${name} logo`, () => {
    test('flashes the lenses white with depth, leaves frame and outline alone, then opens Home', async ({ page }) => {
      await page.goto('/rules');
      const normal = await fill(page, LENS_CENTER, scope);
      expect(normal).not.toBe('rgb(255, 255, 255)');
      const frame = await fill(page, FRAME_PIXEL, scope);
      const outline = await fill(page, OUTLINE_PIXEL, scope);

      // Record what the lens looks like on every frame until the page leaves.
      await page.evaluate((s) => {
        const seen: Record<string, Set<string>> = { center: new Set(), light: new Set(), base: new Set(), frame: new Set(), outline: new Set() };
        (window as any).__seen = seen;
        const q = (sel: string) => document.querySelector(`${s} ${sel}`)!;
        const tick = () => {
          seen.center!.add(getComputedStyle(q('.goggles rect[x="8"][y="5"]')).fill);
          seen.light!.add(getComputedStyle(q('.goggles rect[x="8"][y="8"]')).fill);
          seen.base!.add(getComputedStyle(q('.goggles rect[x="8"][y="9"]')).fill);
          seen.frame!.add(getComputedStyle(q('.goggles rect[x="4"][y="2"]')).fill);
          seen.outline!.add(getComputedStyle(q('.goggles rect[x="3"][y="1"]')).fill);
          requestAnimationFrame(tick);
        };
        tick();
      }, scope);

      await page.locator(`${scope} [data-logo]`).click();
      await page.waitForFunction(() => {
        const s = (window as any).__seen;
        return s && s.center.has('rgb(255, 255, 255)');
      });
      const seen = await page.evaluate(() => {
        const s = (window as any).__seen;
        return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, [...(v as Set<string>)]]));
      });
      expect(seen.center).toContain('rgb(255, 255, 255)');
      expect(seen.light).toContain('rgb(208, 211, 216)');
      expect(seen.base).toContain('rgb(141, 146, 155)');
      expect(seen.frame).toEqual([frame]);
      expect(seen.outline).toEqual([outline]);

      await page.waitForURL((u) => u.pathname === '/');
      // The page is fresh, lens back to normal.
      expect(await fill(page, LENS_CENTER, scope)).toBe(normal);
    });

    test('plays three white flashes in about half a second and never moves the words', async ({ page }) => {
      await page.goto('/');
      await page.evaluate((s) => {
        const mark = document.querySelector(`${s} .goggles`)!;
        const log: { on: boolean; t: number }[] = [];
        (window as any).__log = log;
        new MutationObserver(() => log.push({ on: mark.hasAttribute('data-flash'), t: performance.now() })).observe(mark, { attributes: true, attributeFilter: ['data-flash'] });
        const word = document.querySelector(`${s} .wordmark`)!.getBoundingClientRect();
        (window as any).__wordMoved = false;
        const watch = () => {
          const r = document.querySelector(`${s} .wordmark`)!.getBoundingClientRect();
          if (r.top !== word.top || r.left !== word.left) (window as any).__wordMoved = true;
          requestAnimationFrame(watch);
        };
        watch();
      }, scope);
      await page.locator(`${scope} [data-logo]`).click();
      await page.waitForFunction(() => {
        const l = (window as any).__log as { on: boolean }[];
        return l.length >= 6;
      });
      const { log, moved } = await page.evaluate(() => ({ log: (window as any).__log as { on: boolean; t: number }[], moved: (window as any).__wordMoved as boolean }));
      expect(log.filter((e) => e.on)).toHaveLength(3);
      expect(log.at(-1)!.on).toBe(false);
      expect(moved).toBe(false);
      // No flash is active once finished.
      await expect(page.locator(`${scope} .goggles`)).not.toHaveAttribute('data-flash', '');
    });

    test('on Home it scrolls to the top without reloading', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        document.body.style.minHeight = '3000px';
        (window as any).__same = true;
        window.scrollTo(0, 900);
      });
      await page.locator(`${scope} [data-logo]`).scrollIntoViewIfNeeded();
      await page.locator(`${scope} [data-logo]`).click();
      await page.waitForFunction(() => window.scrollY < 2);
      expect(await page.evaluate(() => (window as any).__same)).toBe(true);
      expect(new URL(page.url()).pathname).toBe('/');
    });

    test('with reduced motion there is no animation and it goes straight home', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/rules');
      await page.evaluate(() => {
        const mark = document.querySelector('.goggles')!;
        (window as any).__flashed = false;
        new MutationObserver(() => ((window as any).__flashed = true)).observe(mark, { attributes: true });
      });
      const t0 = Date.now();
      await page.locator(`${scope} [data-logo]`).click();
      await page.waitForURL((u) => u.pathname === '/');
      expect(Date.now() - t0).toBeLessThan(500);
    });
  });
}

test('the goggles stay crisp pixels', async ({ page }) => {
  await page.goto('/');
  const svg = page.locator('header .goggles');
  await expect(svg).toHaveAttribute('shape-rendering', 'crispEdges');
  const box = await svg.boundingBox();
  expect(box!.width / box!.height).toBeCloseTo(28 / 13, 1);
});

test('the footer shows the same logo lockup as the nav', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('footer [data-logo] .wordmark')).toHaveText('Infinite Laboratory');
  await expect(page.locator('footer [data-logo] .goggles rect')).toHaveCount(await page.locator('header [data-logo] .goggles rect').count());
});

test('a modified click (open in new tab) is left to the browser', async ({ page }) => {
  await page.goto('/rules');
  const [popup] = await Promise.all([
    page.context().waitForEvent('page'),
    page.locator('header [data-logo]').click({ modifiers: ['ControlOrMeta'] }),
  ]);
  await popup.waitForLoadState();
  expect(new URL(popup.url()).pathname).toBe('/');
  expect(new URL(page.url()).pathname).toBe('/rules');
});
