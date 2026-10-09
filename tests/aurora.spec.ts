import { test, expect } from '@playwright/test';

// The aurora is the same on every page: the Home hero and every page header use one component, copied from the mockups.
const ROUTES = ['/', '/rules', '/store', '/vote', '/leaderboards', '/wiki', '/wiki/armored-smp-lessons', '/build-log', '/team', '/brand', '/privacy', '/terms', '/login', '/nope'];

for (const route of ROUTES) {
  test(`${route} has the blue to mint aurora behind its header`, async ({ page }) => {
    await page.goto(route);
    const a = page.locator('.aurora').first();
    await expect(a).toBeAttached();
    const bg = await a.evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bg).toContain('rgba(122, 167, 251, 0.26)'); // blue
    expect(bg).toContain('rgba(155, 251, 162, 0.2)'); // mint
    expect(await a.evaluate((el) => getComputedStyle(el).filter)).toBe('blur(46px)');
    expect(await a.evaluate((el) => getComputedStyle(el).animationName)).toBe('aurora-drift');
    expect(await a.evaluate((el) => getComputedStyle(el).animationDuration)).toBe('10s');
    await expect(page.locator('.aurora-bg [data-bubbles]').first()).toBeAttached();
  });
}

test('the drift goes from 55% to full strength and moves 4% either way, like the mockup', async ({ page }) => {
  await page.goto('/rules');
  const rule = await page.evaluate(() => {
    for (const sheet of document.styleSheets) for (const r of sheet.cssRules) if (r instanceof CSSKeyframesRule && r.name === 'aurora-drift') return [...r.cssRules].map((k) => k.cssText);
    return [];
  });
  const text = rule.join(' ');
  expect(text).toMatch(/opacity: 0\.55/);
  expect(text).toMatch(/opacity: 1/);
  expect(text).toMatch(/translate(3d)?\(-4%/);
  expect(text).toMatch(/translate(3d)?\(4%/);
});

test('page headers are 300px tall with the nav floating over them, like the mockup', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/rules');
  const head = (await page.locator('.rules-head').boundingBox())!;
  expect(head.y).toBe(0);
  expect(head.height).toBeGreaterThanOrEqual(300);
  expect(head.height).toBeLessThan(380);
  await expect(page.locator('.site-nav')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const nav = (await page.locator('.site-nav').boundingBox())!;
  expect(nav.y).toBeLessThan(head.y + head.height); // floats over the header
});

test('with reduced motion the aurora holds still at 80%', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/rules');
  const a = page.locator('.aurora').first();
  await expect(a).toHaveCSS('animation-name', 'none');
  await expect(a).toHaveCSS('opacity', '0.8');
  await expect(page.locator('.lbub-root').first()).toBeHidden();
});
