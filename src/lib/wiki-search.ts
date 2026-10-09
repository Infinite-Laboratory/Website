export interface WikiIndexEntry {
  title: string;
  section: string;
  url: string;
  summary: string;
  text: string;
}

/** Entries matching every word of the query. Title matches first, then body matches. */
export function searchIndex(index: WikiIndexEntry[], query: string): WikiIndexEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const scored = index
    .map((e) => {
      const title = `${e.title} ${e.section}`.toLowerCase();
      const body = `${e.summary} ${e.text}`.toLowerCase();
      if (!words.every((w) => title.includes(w) || body.includes(w))) return null;
      return { e, score: words.filter((w) => title.includes(w)).length };
    })
    .filter((x): x is { e: WikiIndexEntry; score: number } => x !== null);
  return scored.sort((a, b) => b.score - a.score).map((x) => x.e);
}
