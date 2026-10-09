import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

/** A player's face as a data URI, fetched once at build time from a public skin service and cached on disk.
 *  Returns null when it cannot be fetched (offline, unknown name): the page then shows the goggles instead.
 *  Nothing is requested from the visitor's browser, so a visitor's address is never sent to the skin service. */
export async function faceDataUri(ign: string | undefined): Promise<string | null> {
  if (!ign || !/^[A-Za-z0-9_.]{1,32}$/.test(ign) || process.env.LAB_FACES === 'off') return null;
  const dir = '.cache/faces';
  const file = `${dir}/${ign.toLowerCase()}.png`;
  try {
    if (existsSync(file)) return `data:image/png;base64,${readFileSync(file).toString('base64')}`;
    const res = await fetch(`https://mc-heads.net/avatar/${encodeURIComponent(ign)}/64.png`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/png')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, buf);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}
