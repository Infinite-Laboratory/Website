import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { WIKI_SECTIONS } from '../../content.config';
import { withBase } from '../../lib/url';

export const GET: APIRoute = async () => {
  const entries = (await getCollection('wiki')).filter((e) => e.data.language === 'en');
  const index = entries.map((e) => ({
    title: e.data.title,
    section: WIKI_SECTIONS[e.data.section],
    url: withBase(`/wiki/${e.data.slug}`),
    summary: e.data.summary,
    text: (e.body ?? '').replace(/[#*`>\[\]()_-]/g, ' ').replace(/\s+/g, ' ').trim(),
  }));
  return new Response(JSON.stringify(index), { headers: { 'content-type': 'application/json' } });
};
