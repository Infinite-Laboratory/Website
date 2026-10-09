export type Kind = 'Added' | 'Changed' | 'Fixed' | 'Removed';

export interface LogItem {
  data: { date: Date; kind: Kind; title: string; language: 'en' | 'th' };
}

/** Newest first. Entries on the same day keep their given order. */
export function newestFirst<T extends LogItem>(items: T[]): T[] {
  return [...items].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function latest<T extends LogItem>(items: T[], n: number): T[] {
  return newestFirst(items).slice(0, n);
}

/** CSS class for a kind tag. */
export const kindClass = (k: Kind) => ({ Added: 'tag-mint', Changed: 'tag-blue', Fixed: 'tag-plain', Removed: 'tag-danger' })[k];
