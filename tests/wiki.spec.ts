import { test, expect } from '@playwright/test';
import { searchIndex, type WikiIndexEntry } from '../src/lib/wiki-search';

test.describe('wiki landing', () => {
  test('lists the four sections, with real articles and honest empty sections', async ({ page }) => {
    await page.goto('/wiki');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('How it works');
    const titles = await page.locator('.wiki-section h2').allInnerTexts();
    expect(titles.map((t) => t.toLowerCase())).toEqual(['getting started', 'jobs economy', 'commands', 'experiments']);
    await expect(page.locator('#getting-started')).toContainText('Technicians play here');
    await expect(page.locator('#experiments')).toContainText('What we learned from Armored SMP');
    await expect(page.locator('#jobs-economy .empty')).toHaveText('Not written yet.');
    await expect(page.locator('#commands .empty')).toHaveText('Not written yet.');
  });

  test('every article link resolves', async ({ page, request }) => {
    await page.goto('/wiki');
    const hrefs = await page.locator('.wiki-section li a').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
    expect(hrefs.length).toBeGreaterThanOrEqual(3);
    for (const h of hrefs) expect((await request.get(h)).status(), h).toBe(200);
  });
});

test.describe('wiki search', () => {
  test('finds an article by a keyword in its text', async ({ page }) => {
    await page.goto('/wiki');
    const input = page.getByRole('searchbox');
    await input.fill('netherite');
    const results = page.locator('#wiki-results li');
    await expect(results).toHaveCount(1);
    await expect(results.first().getByRole('link')).toHaveText('What we learned from Armored SMP');
    await results.first().getByRole('link').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('What we learned from Armored SMP');
  });

  test('puts title matches first and says so when nothing matches', async ({ page }) => {
    await page.goto('/wiki');
    const input = page.getByRole('searchbox');
    await input.fill('technicians');
    await expect(page.locator('#wiki-results li').first().getByRole('link')).toHaveText('Technicians play here');
    await input.fill('zzzz-not-here');
    await expect(page.locator('#wiki-results')).toHaveText('No articles found.');
    await input.fill('');
    await expect(page.locator('#wiki-results li')).toHaveCount(0);
  });

  test('says search is unavailable when the index cannot be loaded', async ({ page }) => {
    await page.route('**/wiki/search-index.json', (r) => r.abort());
    await page.goto('/wiki');
    await page.getByRole('searchbox').fill('rules');
    await expect(page.locator('#wiki-results')).toHaveText('Search is unavailable right now.');
  });

  test('without JavaScript the search box is hidden and the section lists still work', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/wiki');
    await expect(page.getByRole('searchbox')).toBeHidden();
    await expect(page.locator('#getting-started')).toContainText('Technicians play here');
    await ctx.close();
  });

  test('the search index is built at publish time and has every article', async ({ request }) => {
    const index = (await (await request.get('/wiki/search-index.json')).json()) as WikiIndexEntry[];
    expect(index.map((e) => e.title).sort()).toEqual(['Technicians play here', 'What is an experiment?', 'What we learned from Armored SMP']);
    for (const e of index) expect(e.text.length).toBeGreaterThan(20);
  });
});

test.describe('article pages', () => {
  test('show the title, a table of contents and links to the next and previous articles', async ({ page }) => {
    await page.goto('/wiki/what-is-an-experiment');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('What is an experiment?');
    const toc = page.getByRole('navigation', { name: 'On this page' });
    await expect(toc.getByRole('link')).toHaveText(['The experiments so far', 'Why experiments']);
    await toc.getByRole('link', { name: 'Why experiments' }).click();
    await expect(page).toHaveURL(/#why-experiments$/);
    await expect(page.locator('#why-experiments')).toBeInViewport();
    const pager = page.getByRole('navigation', { name: 'Previous and next articles' });
    await expect(pager.getByRole('link', { name: /Previous/ })).toContainText('Technicians play here');
    await expect(pager.getByRole('link', { name: /Next/ })).toContainText('What we learned from Armored SMP');
  });

  test('the first article has no Previous and the last has no Next', async ({ page }) => {
    await page.goto('/wiki/technicians-play-here');
    await expect(page.locator('.pager .prev')).toHaveCount(0);
    await page.goto('/wiki/armored-smp-lessons');
    await expect(page.locator('.pager .next')).toHaveCount(0);
  });

  test('explains that Technicians play in the world and how to reach them', async ({ page }) => {
    await page.goto('/wiki/technicians-play-here');
    await expect(page.getByText('They log in to play, not only to moderate')).toBeVisible();
    await expect(page.getByText('Discord #support')).toBeVisible();
  });

  test('the Armored SMP lessons exist and the Home legacy link lands on them', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /legacy servers/ }).click();
    await page.getByRole('link', { name: 'Read what we learned >' }).click();
    await expect(page).toHaveURL(/\/wiki\/armored-smp-lessons$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('What we learned from Armored SMP');
  });

  test('links inside articles work', async ({ page }) => {
    await page.goto('/wiki/what-is-an-experiment');
    await page.locator('.wiki-body').getByRole('link', { name: 'what we learned' }).click();
    await expect(page).toHaveURL(/\/wiki\/armored-smp-lessons$/);
    await page.goto('/wiki/what-is-an-experiment');
    await page.locator('.wiki-body').getByRole('link', { name: 'build log' }).click();
    await expect(page).toHaveURL(/\/build-log$/);
  });

  test('are readable with JavaScript off', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/wiki/armored-smp-lessons');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.wiki-body').getByText('went offline for good')).toBeVisible();
    await ctx.close();
  });
});

test.describe('search helper', () => {
  const idx: WikiIndexEntry[] = [
    { title: 'Jobs', section: 'Economy', url: '/a', summary: 'About earning', text: 'miner farmer' },
    { title: 'Commands', section: 'Basics', url: '/b', summary: 'Slash commands', text: 'use /jobs to see your job' },
  ];
  test('needs every word, ranks title hits first, and ignores case', () => {
    expect(searchIndex(idx, 'JOBS').map((e) => e.url)).toEqual(['/a', '/b']);
    expect(searchIndex(idx, 'jobs slash').map((e) => e.url)).toEqual(['/b']);
    expect(searchIndex(idx, '   ')).toEqual([]);
    expect(searchIndex(idx, 'nothing')).toEqual([]);
  });
});
