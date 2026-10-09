import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Rules, wiki articles and build-log entries are markdown files. Thai and English variants of a page
// share a `slug` and differ by `language`, so the language switch can link them.
const base = {
  title: z.string(),
  slug: z.string(),
  language: z.enum(['en', 'th']).default('en'),
  order: z.number().default(0),
  /** Marks placeholder text that still needs the studio's final wording. */
  draft: z.boolean().default(false),
};

const rules = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/rules' }),
  schema: z.object({
    ...base,
    updated: z.coerce.date(),
    intro: z.string().optional(),
    roles: z.array(z.object({ term: z.string(), text: z.string() })).default([]),
    appeals: z.string().optional(),
    consequences: z.array(z.object({ step: z.string(), result: z.string(), detail: z.string() })).default([]),
  }),
});

export const collections = { rules };
