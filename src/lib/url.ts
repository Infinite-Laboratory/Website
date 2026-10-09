// The site can be served from a sub-path (GitHub Pages project sites live under /<repo>/).
// Every internal link and asset goes through withBase so the same build works at "/" or under a base.
const raw = import.meta.env.BASE_URL ?? '/';
export const BASE = raw === '/' ? '' : raw.replace(/\/+$/, '');

/** "/store" -> "/Website/store" (or "/store" when served from the root). */
export function withBase(path: string): string {
  if (!path.startsWith('/')) return path;
  return `${BASE}${path}` || '/';
}

/** The public route for a built pathname: base, ".html" and "/index" removed. "/Website/store.html" -> "/store". */
export function routeOf(pathname: string): string {
  let p = pathname;
  if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length);
  p = p.replace(/\.html$/, '').replace(/\/index$/, '');
  return p === '' ? '/' : p;
}
