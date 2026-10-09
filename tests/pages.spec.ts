import { test, expect } from '@playwright/test';
import { buildAndServe, type StaticSite } from './helpers/static-site';
import { parseFeed } from '../src/lib/stats';
import { formatFellow } from '../src/lib/fellow';

test.describe('what ships today: honest empty states', () => {
  test('Store says it is not open yet, with no products, prices or dead buttons', async ({ page }) => {
    await page.goto('/store');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Not open yet');
    await expect(page.getByText('The store is not open yet')).toBeVisible();
    const text = await page.locator('main').innerText();
    expect(text).not.toMatch(/[$฿€£]\s?\d|\d+\s?(USD|THB)|add to cart|buy now|tier|rank \w+ -/i);
    for (const a of await page.locator('main a').all()) await expect(a).toHaveAttribute('href', /.+/);
    expect(await page.locator('main button').count()).toBe(0);
    await expect(page.getByRole('link', { name: 'Join Discord >' })).toHaveAttribute('href', 'https://discord.gg/FQe3Mt6nA');
  });

  test('Vote says voting opens soon and that there are no rewards', async ({ page }) => {
    await page.goto('/vote');
    await expect(page.getByRole('heading', { name: 'Voting opens soon' })).toBeVisible();
    await expect(page.getByText('no rewards for voting for now')).toBeVisible();
    await expect(page.locator('.vote-list')).toHaveCount(0);
  });

  test('Leaderboards says Not yet recorded and shows no rows', async ({ page }) => {
    await page.goto('/leaderboards');
    await expect(page.getByRole('heading', { name: 'Not yet recorded' })).toBeVisible();
    await expect(page.locator('table')).toHaveCount(0);
    expect(await page.locator('main').innerText()).not.toMatch(/#\d{4}/);
  });
});

test.describe('Vote with sites configured', () => {
  test.describe.configure({ mode: 'serial' });
  let site: StaticSite;
  test.beforeAll(async () => {
    site = await buildAndServe('dist-vote', {
      LAB_VOTE_SITES: JSON.stringify([{ name: 'Example Servers', url: 'https://example.test/vote', cooldown: 'Once every 24 hours' }, { name: 'Another List', url: 'https://example.org/v', cooldown: 'Every 12 hours' }]),
    });
  });
  test.afterAll(() => site?.close());

  test('lists each site with cooldown text, opening in a new tab, and says there are no rewards', async ({ page }) => {
    await page.goto(site.url('/vote'));
    const items = page.locator('.vote-list li');
    await expect(items).toHaveCount(2);
    await expect(items.first()).toContainText('Example Servers');
    await expect(items.first()).toContainText('Once every 24 hours');
    const a = items.first().getByRole('link');
    await expect(a).toHaveAttribute('href', 'https://example.test/vote');
    await expect(a).toHaveAttribute('target', '_blank');
    await expect(a).toHaveAttribute('rel', /noopener/);
    await expect(page.getByText('no rewards for voting for now')).toBeVisible();
    await expect(page.getByText('Voting opens soon')).toHaveCount(0);
  });
});

test.describe('Leaderboards with feed data', () => {
  test.describe.configure({ mode: 'serial' });
  let site: StaticSite;
  test.beforeAll(async () => {
    site = await buildAndServe('dist-stats', { LAB_STATS_FEED: 'tests/fixtures/stats-feed.json' });
  });
  test.afterAll(() => site?.close());

  test('each row shows rank, #NNNN and name the same way, ordered by rank', async ({ page }) => {
    await page.goto(site.url('/leaderboards'));
    const board = page.locator('.lb-board:visible');
    await expect(board).toHaveCount(1);
    const rows = await board.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.children].map((c) => c.textContent?.trim())));
    expect(rows).toEqual([
      ['1', '#0427', 'Quill', '12,840'],
      ['2', '#0013', 'Nova', '5,200'],
      ['3', '#1999', 'Moss', '900'],
    ]);
    // identical markup for every row: no per-row flags or extra classes
    const shapes = await board.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.attributes].map((a) => a.name).join(',') + '|' + [...tr.children].map((c) => c.tagName + c.getAttribute('class')).join(',')));
    expect(new Set(shapes).size).toBe(1);
  });

  test('has tabs per metric and an experiment filter', async ({ page }) => {
    await page.goto(site.url('/leaderboards'));
    await expect(page.getByRole('group', { name: 'Metric' }).getByRole('button')).toHaveText(['Top earners', 'Playtime']);
    await page.getByRole('button', { name: 'Playtime' }).click();
    await expect(page.locator('.lb-board:visible tbody tr')).toHaveCount(1);
    await expect(page.locator('.lb-board:visible')).toContainText('120');
    await page.getByRole('button', { name: 'Top earners' }).click();
    await page.getByLabel('Experiment').selectOption('armored-smp');
    await expect(page.locator('.lb-board:visible')).toContainText('Old');
    await expect(page.locator('.lb-board:visible')).not.toContainText('Quill');
  });

  test('the page and the feed never carry link status or other private fields', async ({ page, request }) => {
    const res = await request.get(site.url('/leaderboards'));
    const html = await res.text();
    expect(html).not.toMatch(/linked|unlinked|email|x@example/i);
    await page.goto(site.url('/leaderboards'));
    expect(await page.content()).not.toMatch(/"linked"|x@example\.test/);
  });

  test('has no N/A rank state: every fellow has a number', async ({ page }) => {
    await page.goto(site.url('/leaderboards'));
    expect(await page.locator('main').innerText()).not.toMatch(/N\/A/i);
  });

  test('without JavaScript every board is listed', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(site.url('/leaderboards'));
    await expect(page.locator('.lb-board')).toHaveCount(3);
    await expect(page.locator('.lb-board').first()).toBeVisible();
    await ctx.close();
  });
});

test.describe('feed parsing and fellow numbers', () => {
  test('keeps only the known fields, drops bad rows, orders by rank', () => {
    const boards = parseFeed({ boards: [{ experiment: 'e', metric: 'm', label: 'L', rows: [
      { rank: 2, number: 5, name: 'b', value: 1, linked: true, email: 'x' },
      { rank: 1, number: 6, name: 'a', value: 2 },
      { rank: 3, number: 0, name: 'zero', value: 1 },
      { rank: 4, number: 7, name: '', value: 1 },
      { rank: 5, number: 8, name: 'nan', value: 'x' },
    ] }] });
    expect(boards[0]!.rows).toEqual([{ rank: 1, number: 6, name: 'a', value: 2 }, { rank: 2, number: 5, name: 'b', value: 1 }]);
    for (const r of boards[0]!.rows) expect(Object.keys(r).sort()).toEqual(['name', 'number', 'rank', 'value']);
  });

  test('a missing or broken feed is an empty list, never an error', () => {
    expect(parseFeed(null)).toEqual([]);
    expect(parseFeed({})).toEqual([]);
    expect(parseFeed({ boards: 'x' })).toEqual([]);
    expect(parseFeed({ boards: [{ rows: [] }] })).toEqual([]);
  });

  test('fellow numbers are zero-padded to four digits and never N/A', () => {
    expect(formatFellow(13)).toBe('#0013');
    expect(formatFellow(427)).toBe('#0427');
    expect(formatFellow(12345)).toBe('#12345');
    expect(() => formatFellow(0)).toThrow();
    expect(() => formatFellow(NaN)).toThrow();
  });
});
