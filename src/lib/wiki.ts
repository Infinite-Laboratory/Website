import { WIKI_SECTIONS } from '../content.config';

interface WikiLike { data: { section: keyof typeof WIKI_SECTIONS; order: number; language: 'en' | 'th' } }

/** Articles of one language: section order first, then article order. */
export function articlesFor<T extends WikiLike>(all: T[], lang: 'en' | 'th'): T[] {
  const sections = Object.keys(WIKI_SECTIONS);
  return all
    .filter((e) => e.data.language === lang)
    .sort((a, b) => sections.indexOf(a.data.section) - sections.indexOf(b.data.section) || a.data.order - b.data.order);
}

export function neighbours<T>(list: T[], i: number): { prev?: T; next?: T } {
  return { prev: list[i - 1], next: list[i + 1] };
}
