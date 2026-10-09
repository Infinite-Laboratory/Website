import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const NAV = ['Home', 'Store', 'Vote', 'Leaderboards', 'Wiki', 'Rules'];
const ROUTES = ['/', '/store', '/vote', '/leaderboards', '/wiki', '/rules', '/login', '/register', '/team', '/brand', '/privacy', '/terms'];

test.describe('nav', () => {
  for (const route of ROUTES) {
    test(`shows the six links on ${route}`, async ({ page }) => {
      await page.goto(route);
      const links = page.getByRole('navigation', { name: 'Main' }).getByRole('link');
      await expect(links).toHaveText(NAV);
    });
  }

  for (const [route, label] of [['/', 'Home'], ['/store', 'Store'], ['/vote', 'Vote'], ['/leaderboards', 'Leaderboards'], ['/wiki', 'Wiki'], ['/rules', 'Rules']]) {
    test(`marks ${label} as the current page on ${route}`, async ({ page }) => {
      await page.goto(route);
      const current = page.getByRole('navigation', { name: 'Main' }).locator('[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveText(label);
      await expect(current).toHaveCSS('border-bottom-color', 'rgb(155, 251, 162)');
    });
  }

  test('shows Login and Register', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toHaveAttribute('href', '/login');
    await expect(page.getByRole('link', { name: 'Register', exact: true })).toHaveAttribute('href', '/register');
  });

  test('every nav and footer link resolves', async ({ page, request }) => {
    await page.goto('/');
    const hrefs = await page.locator('header a[href^="/"], footer a[href^="/"]').evaluateAll((as) => [...new Set(as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!))]);
    expect(hrefs.length).toBeGreaterThan(8);
    for (const h of hrefs) {
      const res = await request.get(h);
      expect(res.status(), h).toBe(200);
    }
  });
});

test.describe('mobile menu', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('collapses and opens', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    const burger = page.getByRole('button', { name: 'Menu' });
    await expect(nav).toBeHidden();
    await expect(burger).toHaveAttribute('aria-expanded', 'false');
    await burger.click();
    await expect(burger).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.getByRole('link')).toHaveText(NAV);
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Register', exact: true })).toBeVisible();
  });

  test('closes on Escape and returns focus to the button', async ({ page }) => {
    await page.goto('/');
    const burger = page.getByRole('button', { name: 'Menu' });
    await burger.click();
    await page.keyboard.press('Escape');
    await expect(burger).toHaveAttribute('aria-expanded', 'false');
    await expect(burger).toBeFocused();
  });
});

test.describe('footer', () => {
  test('has a plain copyright line and the expected links', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    await expect(footer).toContainText(`© ${new Date().getFullYear()} Infinite Laboratory`);
    for (const [name, href] of [['Discord', 'https://discord.gg/FQe3Mt6nA'], ['SingularityLib', 'https://github.com/Pinont/SingularityLib'], ['Our team', '/team'], ['Brand kit', '/brand'], ['Privacy', '/privacy'], ['Terms', '/terms']]) {
      await expect(footer.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
    }
  });

  test('external links open safely in a new tab', async ({ page }) => {
    await page.goto('/');
    for (const name of ['Discord', 'SingularityLib']) {
      const a = page.getByRole('contentinfo').getByRole('link', { name, exact: true });
      await expect(a).toHaveAttribute('target', '_blank');
      await expect(a).toHaveAttribute('rel', /noopener/);
    }
  });
});

test.describe('metadata', () => {
  for (const route of ROUTES) {
    test(`has title, description, canonical, icons and social image on ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveTitle(/Infinite Laboratory/);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{20,}/);
      await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0B0C0E');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\/.+/);
      await expect(page.locator('link[rel="icon"][href="/favicon.ico"]')).toHaveCount(1);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/assets\/og\.png$/);
    });
  }

  test('canonical points at the clean route', async ({ page }) => {
    await page.goto('/rules');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/rules$/);
    await page.goto('/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/$/);
  });

  test('titles differ per page', async ({ page }) => {
    await page.goto('/rules');
    await expect(page).toHaveTitle('Rules · Infinite Laboratory');
  });

  test('social preview image exists and is 1200x630', async ({ request }) => {
    const res = await request.get('/assets/og.png');
    expect(res.status()).toBe(200);
    const buf = await res.body();
    expect(buf.readUInt32BE(16)).toBe(1200);
    expect(buf.readUInt32BE(20)).toBe(630);
  });
});

test.describe('page edge and fonts', () => {
  test('the top page edge is plain #0B0C0E', async ({ page }) => {
    await page.goto('/rules');
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(11, 12, 14)');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(11, 12, 14)');
    await expect(page.locator('.site-nav')).toHaveCSS('background-color', 'rgb(11, 12, 14)');
    // On Home the hero starts at the very top and its first pixels are plain #0B0C0E too.
    await page.goto('/');
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(11, 12, 14)');
    await expect(page.locator('.hero-shade')).toHaveCSS('background-image', /rgb\(11, 12, 14\)/);
  });

  test('text renders without waiting on fonts', async ({ page }) => {
    await page.route('**/*.woff2', (r) => r.abort());
    await page.route('**/*.woff', (r) => r.abort());
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('404', () => {
  test('renders in the lab voice with links home and to the wiki', async ({ page }) => {
    const res = await page.goto('/this-does-not-exist');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page failed.');
    await expect(page.getByText('We logged it. Good.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to the lab' })).toHaveAttribute('href', '/');
    await expect(page.getByRole('link', { name: 'Read the wiki' })).toHaveAttribute('href', '/wiki');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  });
});

test.describe('accessibility', () => {
  for (const route of ['/', '/rules', '/privacy']) {
    test(`has no axe violations on ${route}`, async ({ page }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
    });
  }

  test('has no axe violations on the 404 page', async ({ page }) => {
    await page.goto('/nope');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });

  test('has landmarks and a skip link', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
  });

  test('keyboard focus is visible on nav links', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
    expect(outline).not.toBe('none');
  });

  test('reduced motion removes animation and transitions', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const dur = await page.evaluate(() => getComputedStyle(document.querySelector('.btn')!).transitionDuration);
    expect(parseFloat(dur)).toBeLessThan(0.01);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 800 } });

  test('nav links and content stay readable on a phone', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const links = page.getByRole('navigation', { name: 'Main' }).getByRole('link');
    await expect(links).toHaveText(NAV);
    await expect(links.first()).toBeVisible();
  });
});
