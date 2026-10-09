// The Discord online count shown on Home, from the public server widget.
// The widget must be enabled in Discord Server Settings. On any failure we show the last good number, or 0.
export const CACHE_KEY = 'lab_discord_online';
export const TTL_MS = 5 * 60 * 1000;

export interface Cached { n: number; t: number }

export function parseCached(raw: string | null): Cached | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return Number.isInteger(v?.n) && v.n >= 0 && Number.isFinite(v?.t) ? { n: v.n, t: v.t } : null;
  } catch {
    return null;
  }
}

/** `presence_count` from a widget response, or null when the response is not a usable count. */
export function presenceFrom(data: unknown): number | null {
  const n = (data as { presence_count?: unknown } | null)?.presence_count;
  return Number.isInteger(n) && (n as number) >= 0 ? (n as number) : null;
}

export interface CountEnv {
  storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  fetchJson: (url: string) => Promise<unknown>;
  now: () => number;
}

/** The number to show now, and whether it is fresh enough that no request is needed. */
export function readCount(env: CountEnv): { n: number; fresh: boolean } {
  let cached: Cached | null = null;
  try { cached = parseCached(env.storage?.getItem(CACHE_KEY) ?? null); } catch { /* storage blocked */ }
  if (!cached) return { n: 0, fresh: false };
  return { n: cached.n, fresh: env.now() - cached.t < TTL_MS };
}

/** Ask the widget; on success remember the number. Throws on failure so the caller keeps the last good value. */
export async function refreshCount(guildId: string, env: CountEnv): Promise<number> {
  const data = await env.fetchJson(`https://discord.com/api/guilds/${guildId}/widget.json`);
  const n = presenceFrom(data);
  if (n === null) throw new Error('widget did not report a count');
  try { env.storage?.setItem(CACHE_KEY, JSON.stringify({ n, t: env.now() })); } catch { /* storage blocked */ }
  return n;
}
