// Helpers for markdown content. Thai and English variants of a page share a `slug`.
export interface Variantable {
  data: { slug: string; language: 'en' | 'th'; order: number };
}

export type Variants<T> = { en?: T; th?: T };

/** Group entries by slug: { rules: { en, th } }. */
export function variantsBySlug<T extends Variantable>(entries: T[]): Map<string, Variants<T>> {
  const out = new Map<string, Variants<T>>();
  for (const e of entries) {
    const v = out.get(e.data.slug) ?? {};
    v[e.data.language] = e;
    out.set(e.data.slug, v);
  }
  return out;
}

/** The entry to show for a language, falling back to English when there is no translation yet. */
export function pick<T>(v: Variants<T> | undefined, language: 'en' | 'th'): T | undefined {
  return v?.[language] ?? v?.en;
}

/** "Oct 08, 2026" (UTC, so the build machine's time zone never shifts the day). */
export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' });
}
