import { test, expect } from '@playwright/test';

test.describe('Privacy', () => {
  test('lists what is collected, why, who sees it, sharing, retention, rights and cookies', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy');
    const heads = await page.locator('.legal-body h2').allInnerTexts();
    expect(heads).toEqual(['What we collect', 'Why we collect it', 'What other people can see', 'Who we share it with', 'How long we keep it', 'Your rights', 'Cookies', 'Contact']);
    await expect(page.locator('.legal-body')).toContainText('Thailand');
    await expect(page.locator('.legal-body')).toContainText('PDPA');
    await expect(page.locator('.legal-body')).toContainText('We do not collect passwords');
    await expect(page.locator('.legal-body')).toContainText('We do not sell your data');
  });

  test('is honest that nothing is stored about visitors today', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('.legal-body')).toContainText('Today this website stores nothing about you');
  });

  test('says link status and email are never shown to others', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('.legal-body')).toContainText('whether you linked an account are not shown to others');
  });
});

test.describe('Terms', () => {
  test('state that the server is not an official Minecraft service', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Terms');
    await expect(page.locator('.legal-body')).toContainText('not an official Minecraft service');
    await expect(page.locator('.legal-body')).toContainText('Mojang or Microsoft');
  });

  test('link to the rules and the build log (links are relative, so they work under any base path)', async ({ page }) => {
    await page.goto('/terms');
    const hrefs = await page.locator('.legal-body a').evaluateAll((as) => as.map((a) => [a.textContent, (a as HTMLAnchorElement).href, a.getAttribute('href')]));
    expect(hrefs.map((h) => [h[0], new URL(h[1]!).pathname])).toEqual([['rules', '/rules'], ['build log', '/build-log']]);
    for (const h of hrefs) expect(h[2]!.startsWith('/')).toBe(false);
  });
});

for (const route of ['/privacy', '/terms']) {
  test.describe(`${route} draft marking`, () => {
    test('is marked as a draft until legal review is recorded', async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('.draft-tag')).toHaveText('Draft');
      await expect(page.getByRole('note')).toContainText('has not been reviewed by a qualified person');
      await expect(page.locator('.legal-meta time')).toHaveText('Oct 09, 2026');
      await expect(page.locator('.legal-meta')).not.toContainText('Reviewed');
    });

    test('is linked from the footer and readable with JavaScript off', async ({ page, browser }) => {
      await page.goto('/');
      await expect(page.getByRole('contentinfo').getByRole('link', { name: route === '/privacy' ? 'Privacy' : 'Terms' })).toHaveAttribute('href', route);
      const ctx = await browser.newContext({ javaScriptEnabled: false });
      const p = await ctx.newPage();
      await p.goto(route);
      await expect(p.locator('.legal-body h2').first()).toBeVisible();
      await ctx.close();
    });
  });
}
