// Saves the latest threads of a Discord forum channel to src/data/threads.json, for the Home page.
// Run daily by .github/workflows/refresh-threads.yml with a read-only bot token (a repository secret).
// On any failure the saved file is left exactly as it was, so the page keeps showing the last good copy.
import { readFileSync, writeFileSync } from 'node:fs';

const API = 'https://discord.com/api/v10';
export const FILE = 'src/data/threads.json';
export const LIMIT = 5;

/** Keep only a title, a category and a time. No author, no message text, no ids that point at people. */
export function toThreads(active, channel, limit = LIMIT) {
  const tags = new Map((channel?.available_tags ?? []).map((t) => [t.id, t.name]));
  return (active?.threads ?? [])
    .filter((t) => t.parent_id === channel?.id && typeof t.name === 'string' && t.name.trim())
    .map((t) => ({
      title: String(t.name).trim().slice(0, 120),
      category: tags.get((t.applied_tags ?? [])[0]) ?? channel?.name ?? 'Thread',
      time: t.thread_metadata?.create_timestamp ?? null,
    }))
    .filter((t) => t.time && !Number.isNaN(Date.parse(t.time)))
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
    .slice(0, limit);
}

export async function fetchThreads({ token, guildId, channelId, fetchFn = fetch }) {
  const headers = { authorization: `Bot ${token}`, 'user-agent': 'InfiniteLaboratoryWebsite (threads refresh)' };
  const get = async (path) => {
    const res = await fetchFn(`${API}${path}`, { headers });
    if (!res.ok) throw new Error(`Discord ${res.status} for ${path}`);
    return res.json();
  };
  const [channel, active] = await Promise.all([get(`/channels/${channelId}`), get(`/guilds/${guildId}/threads/active`)]);
  return toThreads(active, channel);
}

export async function refresh(env, { fetchFn = fetch, read = (f) => readFileSync(f, 'utf8'), write = writeFileSync, now = () => new Date() } = {}) {
  const { DISCORD_BOT_TOKEN: token, DISCORD_GUILD_ID: guildId, DISCORD_THREADS_CHANNEL_ID: channelId } = env;
  if (!token || !guildId || !channelId) return { changed: false, reason: 'not configured' };
  try {
    const threads = await fetchThreads({ token, guildId, channelId, fetchFn });
    const previous = JSON.parse(read(FILE));
    if (JSON.stringify(previous.threads) === JSON.stringify(threads)) return { changed: false, reason: 'unchanged' };
    write(FILE, JSON.stringify({ updated: now().toISOString(), threads }, null, 2) + '\n');
    return { changed: true, count: threads.length };
  } catch (err) {
    return { changed: false, reason: `failed: ${err.message}` };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await refresh(process.env);
  console.log(JSON.stringify(r));
  if (String(r.reason).startsWith('failed')) process.exitCode = 0; // keep the last good copy; never fail the daily job
}
