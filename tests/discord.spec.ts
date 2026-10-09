import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { buildAndServe, type StaticSite } from './helpers/static-site';
import { CACHE_KEY, TTL_MS, parseCached, presenceFrom, readCount, refreshCount } from '../src/lib/discord-count';
import { toThreads, refresh, fetchThreads, FILE } from '../scripts/refresh-threads.mjs';

const WIDGET = 'https://discord.com/api/guilds/1097120015448277114/widget.json';
const cors = { 'access-control-allow-origin': '*' };

test.describe('Discord online count on Home', () => {
  test('shows the count the widget reports and remembers it', async ({ page }) => {
    await page.route(WIDGET, (r) => r.fulfill({ json: { presence_count: 47 }, headers: cors }));
    await page.goto('/');
    await expect(page.locator('#dcount')).toHaveText('Discord · 47 online');
    await expect(page.locator('#dcount')).toHaveAttribute('href', 'https://discord.gg/FQe3Mt6nA');
    expect(JSON.parse((await page.evaluate((k) => localStorage.getItem(k), CACHE_KEY))!).n).toBe(47);
  });

  test('shows 0 when the widget has never worked (for example it is disabled)', async ({ page }) => {
    await page.route(WIDGET, (r) => r.fulfill({ status: 403, json: { message: 'Widget Disabled', code: 50004 }, headers: cors }));
    await page.goto('/');
    await expect(page.locator('#dcount')).toHaveText('Discord · 0 online');
  });

  test('keeps showing the last good number when a later request fails', async ({ page }) => {
    await page.addInitScript(([k, t]) => localStorage.setItem(k as string, JSON.stringify({ n: 31, t: (t as number) - 3_600_000 })), [CACHE_KEY, Date.now()]);
    await page.route(WIDGET, (r) => r.abort());
    await page.goto('/');
    await expect(page.locator('#dcount')).toHaveText('Discord · 31 online');
  });

  test('does not ask the widget again while the cached number is fresh', async ({ page }) => {
    let calls = 0;
    await page.addInitScript(([k, t]) => localStorage.setItem(k as string, JSON.stringify({ n: 12, t: t as number })), [CACHE_KEY, Date.now()]);
    await page.route(WIDGET, (r) => { calls++; return r.fulfill({ json: { presence_count: 99 }, headers: cors }); });
    await page.goto('/');
    await expect(page.locator('#dcount')).toHaveText('Discord · 12 online');
    await page.waitForTimeout(300);
    expect(calls).toBe(0);
  });

  test('ignores a widget answer that is not a count, and works when storage is blocked', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
    await page.route(WIDGET, (r) => r.fulfill({ json: { presence_count: 'many' }, headers: cors }));
    await page.goto('/');
    await expect(page.locator('#dcount')).toHaveText('Discord · 0 online');
  });

  test('is readable with JavaScript off (shows 0)', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('#dcount')).toHaveText('Discord · 0 online');
    await ctx.close();
  });
});

test.describe('Latest threads on Home', () => {
  test('are never hidden: with no saved copy the block says so', async ({ page }) => {
    await page.goto('/');
    const box = page.getByRole('region', { name: 'Latest threads' });
    await expect(box).toBeVisible();
    await expect(box).toContainText('No threads yet.');
    await expect(box).toContainText('Not updated yet');
  });

  test('the Store note says it is not open yet', async ({ page }) => {
    await page.goto('/');
    const store = page.getByRole('region', { name: 'Store' });
    await expect(store).toContainText('Not open yet.');
    await expect(store.getByRole('link', { name: 'Read more >' })).toHaveAttribute('href', '/store');
  });

  test.describe('with a saved copy', () => {
    test.describe.configure({ mode: 'serial' });
    let site: StaticSite;
    test.beforeAll(async () => { site = await buildAndServe('dist-threads', { LAB_THREADS_FILE: 'tests/fixtures/threads.json' }); });
    test.afterAll(() => site?.close());

    test('show title, category and time only, plus when the copy was updated', async ({ page }) => {
      await page.goto(site.url('/'));
      const box = page.getByRole('region', { name: 'Latest threads' });
      const items = box.locator('li');
      await expect(items).toHaveCount(2);
      await expect(items.first()).toContainText('Best early-game job order?');
      await expect(items.first()).toContainText('Jobs');
      await expect(items.first().locator('time')).toHaveText('Oct 08, 2026');
      await expect(box).toContainText('Updated Oct 09, 2026');
      expect(await box.innerText()).not.toMatch(/#\d{4}|fellow \d/i);
    });
  });
});

test.describe('count helpers', () => {
  const env = (store: Record<string, string>, json: unknown, now = 1_000_000) => ({
    storage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } },
    fetchJson: async () => { if (json instanceof Error) throw json; return json; },
    now: () => now,
  });

  test('reads only well-formed cached values', () => {
    expect(parseCached('{"n":5,"t":10}')).toEqual({ n: 5, t: 10 });
    for (const bad of [null, '', 'x', '{"n":-1,"t":1}', '{"n":1.5,"t":1}', '{"n":1}', '{"t":1}']) expect(parseCached(bad), String(bad)).toBeNull();
    expect(presenceFrom({ presence_count: 3 })).toBe(3);
    expect(presenceFrom({ presence_count: '3' })).toBeNull();
    expect(presenceFrom(null)).toBeNull();
  });

  test('fresh for five minutes, then stale; 0 when nothing is cached', async () => {
    const store: Record<string, string> = {};
    expect(readCount(env(store, {}))).toEqual({ n: 0, fresh: false });
    expect(await refreshCount('g', env(store, { presence_count: 9 }, 1_000_000))).toBe(9);
    expect(readCount(env(store, {}, 1_000_000 + TTL_MS - 1))).toEqual({ n: 9, fresh: true });
    expect(readCount(env(store, {}, 1_000_000 + TTL_MS))).toEqual({ n: 9, fresh: false });
  });

  test('a failed refresh throws and leaves the last good number alone', async () => {
    const store: Record<string, string> = { [CACHE_KEY]: '{"n":7,"t":1}' };
    await expect(refreshCount('g', env(store, new Error('down')))).rejects.toThrow();
    await expect(refreshCount('g', env(store, { code: 50004 }))).rejects.toThrow();
    expect(store[CACHE_KEY]).toBe('{"n":7,"t":1}');
  });
});

test.describe('threads refresh script', () => {
  const channel = { id: 'c1', name: 'feedback', available_tags: [{ id: 't1', name: 'Jobs' }] };
  const active = { threads: [
    { name: 'Older', parent_id: 'c1', applied_tags: [], thread_metadata: { create_timestamp: '2026-10-01T00:00:00Z' }, owner_id: '123', last_message_id: '9' },
    { name: 'Newest', parent_id: 'c1', applied_tags: ['t1'], thread_metadata: { create_timestamp: '2026-10-08T00:00:00Z' }, owner_id: '456' },
    { name: 'Elsewhere', parent_id: 'c2', thread_metadata: { create_timestamp: '2026-10-09T00:00:00Z' } },
    { name: '  ', parent_id: 'c1', thread_metadata: { create_timestamp: '2026-10-09T00:00:00Z' } },
    { name: 'No time', parent_id: 'c1', thread_metadata: {} },
  ] };

  test('keeps only title, category and time, newest first, for this channel', () => {
    const out = toThreads(active, channel);
    expect(out).toEqual([
      { title: 'Newest', category: 'Jobs', time: '2026-10-08T00:00:00Z' },
      { title: 'Older', category: 'feedback', time: '2026-10-01T00:00:00Z' },
    ]);
    expect(JSON.stringify(out)).not.toMatch(/owner|123|456|last_message/);
  });

  const files = (initial: string) => { const f = { v: initial }; return { f, read: () => f.v, write: (_: string, d: string) => { f.v = d; } }; };
  const ok = (body: unknown) => async () => new Response(JSON.stringify(body), { status: 200 });
  const router = (map: Record<string, unknown | number>) => async (url: string) => {
    const hit = Object.entries(map).find(([k]) => url.endsWith(k));
    if (!hit) return new Response('{}', { status: 404 });
    return typeof hit[1] === 'number' ? new Response('{}', { status: hit[1] }) : new Response(JSON.stringify(hit[1]), { status: 200 });
  };
  const env = { DISCORD_BOT_TOKEN: 'secret-token', DISCORD_GUILD_ID: 'g1', DISCORD_THREADS_CHANNEL_ID: 'c1' };
  const start = JSON.stringify({ updated: null, threads: [] });

  test('writes the saved copy with an update time when the list changed', async () => {
    const m = files(start);
    const r = await refresh(env, { fetchFn: router({ '/channels/c1': channel, '/guilds/g1/threads/active': active }) as any, read: m.read, write: m.write, now: () => new Date('2026-10-09T03:17:00Z') });
    expect(r).toEqual({ changed: true, count: 2 });
    const saved = JSON.parse(m.f.v);
    expect(saved.updated).toBe('2026-10-09T03:17:00.000Z');
    expect(saved.threads).toHaveLength(2);
    expect(m.f.v).not.toContain('secret-token');
  });

  test('leaves the saved copy untouched on any failure, and when nothing changed or nothing is configured', async () => {
    const m = files(start);
    expect((await refresh(env, { fetchFn: router({ '/channels/c1': 500, '/guilds/g1/threads/active': 500 }) as any, read: m.read, write: m.write })).reason).toMatch(/^failed/);
    expect((await refresh(env, { fetchFn: (async () => { throw new Error('offline'); }) as any, read: m.read, write: m.write })).reason).toMatch(/^failed/);
    expect(await refresh({}, { read: m.read, write: m.write })).toEqual({ changed: false, reason: 'not configured' });
    expect(m.f.v).toBe(start);
    const same = files(JSON.stringify({ updated: 'x', threads: toThreads(active, channel) }));
    expect((await refresh(env, { fetchFn: router({ '/channels/c1': channel, '/guilds/g1/threads/active': active }) as any, read: same.read, write: same.write })).reason).toBe('unchanged');
  });

  test('sends the token only as a bot Authorization header', async () => {
    const seen: any[] = [];
    await fetchThreads({ token: 'tok', guildId: 'g1', channelId: 'c1', fetchFn: (async (url: string, init: any) => { seen.push([url, init.headers.authorization]); return new Response(JSON.stringify(url.includes('threads') ? { threads: [] } : channel)); }) as any });
    expect(seen.every(([url, auth]) => auth === 'Bot tok' && !String(url).includes('tok'))).toBe(true);
  });

  test('the shipped file is a valid empty copy', () => {
    expect(JSON.parse(readFileSync(FILE, 'utf8'))).toEqual({ updated: null, threads: [] });
  });
});
