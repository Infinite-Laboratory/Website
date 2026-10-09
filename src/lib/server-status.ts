// Where a live experiment's player count comes from. One small interface so the source can be swapped
// (for example for a feed from the game server later). A failure never produces a made-up number.
export interface ServerStatus {
  online: number;
  max: number;
  /** Round-trip time in ms, when the source can measure it. */
  pingMs?: number;
}

export interface ServerStatusSource {
  fetch(address: string): Promise<ServerStatus>;
}

/** Public status API (mcsrvstat.us). It reports players but not latency. */
export const publicStatusSource: ServerStatusSource = {
  async fetch(address) {
    const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(address)}`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const d = await res.json();
    if (!d || d.online !== true || typeof d.players?.online !== 'number' || typeof d.players?.max !== 'number') {
      throw new Error('server did not report players');
    }
    return { online: d.players.online, max: d.players.max };
  },
};

/** 0-4 filled bars for a latency in ms. */
export function pingBars(ms: number): number {
  if (ms < 60) return 4;
  if (ms < 120) return 3;
  if (ms < 200) return 2;
  return 1;
}
