// Languages. Thai is the studio's main voice and English follows it. The site serves English at the root
// until Thai copy has been written and reviewed; then DEFAULT_LANGUAGE flips and English moves under /en.
export const LANGUAGES = ['en', 'th'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'en';

export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', th: 'ไทย' };

/** "/th/rules" -> { lang: "th", route: "/rules" }. */
export function splitLanguage(route: string): { lang: Language; route: string } {
  for (const l of LANGUAGES) {
    if (l === DEFAULT_LANGUAGE) continue;
    if (route === `/${l}` || route.startsWith(`/${l}/`)) return { lang: l, route: route.slice(l.length + 1) || '/' };
  }
  return { lang: DEFAULT_LANGUAGE, route };
}

/** The public route for a language: "/rules" in th -> "/th/rules". */
export function localizedRoute(route: string, lang: Language): string {
  if (lang === DEFAULT_LANGUAGE) return route;
  return route === '/' ? `/${lang}` : `/${lang}${route}`;
}

export type Alternates = Partial<Record<Language, string>>;
