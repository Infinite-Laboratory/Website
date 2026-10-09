import { readFileSync, existsSync } from 'node:fs';

// The stats feed: what the game server reports for the leaderboards. It does not exist yet, so with no
// file the page shows "Not yet recorded". The feed must never carry link status: only these fields are read.
export interface PlayerRow {
  rank: number;
  number: number;
  name: string;
  value: number;
}
export interface Board {
  experiment: string;
  metric: string;
  label: string;
  unit?: string;
  rows: PlayerRow[];
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN);

/** Keep only the known fields of a raw feed. Anything else (such as a link flag) is dropped here. */
export function parseFeed(raw: unknown): Board[] {
  const boards = (raw as { boards?: unknown[] } | null)?.boards;
  if (!Array.isArray(boards)) return [];
  return boards.flatMap((b: any) => {
    const rows: PlayerRow[] = (Array.isArray(b?.rows) ? b.rows : [])
      .map((r: any) => ({ rank: num(r?.rank), number: num(r?.number), name: str(r?.name), value: num(r?.value) }))
      .filter((r: PlayerRow) => Number.isInteger(r.rank) && Number.isInteger(r.number) && r.number >= 1 && r.name && !Number.isNaN(r.value))
      .sort((a: PlayerRow, b: PlayerRow) => a.rank - b.rank);
    const experiment = str(b?.experiment), metric = str(b?.metric), label = str(b?.label);
    if (!experiment || !metric || !label) return [];
    return [{ experiment, metric, label, unit: str(b?.unit) || undefined, rows }];
  });
}

/** Load the feed from the file named by LAB_STATS_FEED, or src/data/stats-feed.json when it exists. */
export function loadFeed(): Board[] {
  const path = process.env.LAB_STATS_FEED || 'src/data/stats-feed.json';
  if (!existsSync(path)) return [];
  try {
    return parseFeed(JSON.parse(readFileSync(path, 'utf8')));
  } catch {
    return [];
  }
}
