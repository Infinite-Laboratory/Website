import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Rules, wiki articles and build-log entries are markdown files. Thai and English variants of a page
// share a `slug` and differ by `language`, so the language switch can link them.
// Tests point this at a copy of the content that also has Thai fixture pages. Production uses src/content.
const CONTENT = process.env.LAB_CONTENT_DIR || './src/content';

// The front matter `slug` is shared by the Thai and English variants of a page, so it cannot be the entry id
// (the loader would keep only one of them). Use the file name, such as "rules.en".
const generateId = ({ entry }: { entry: string }) => entry.replace(/\.md$/, '');

const base = {
  title: z.string(),
  slug: z.string(),
  language: z.enum(['en', 'th']).default('en'),
  order: z.number().default(0),
  /** Marks placeholder text that still needs the studio's final wording. */
  draft: z.boolean().default(false),
};

const rules = defineCollection({
  loader: glob({ pattern: '*.md', base: `${CONTENT}/rules`, generateId }),
  schema: z.object({
    ...base,
    updated: z.coerce.date(),
    intro: z.string().optional(),
    roles: z.array(z.object({ term: z.string(), text: z.string() })).default([]),
    appeals: z.string().optional(),
    consequences: z.array(z.object({ step: z.string(), result: z.string(), detail: z.string() })).default([]),
  }),
});

const buildlog = defineCollection({
  loader: glob({ pattern: '*.md', base: `${CONTENT}/buildlog`, generateId }),
  schema: z.object({
    ...base,
    date: z.coerce.date(),
    kind: z.enum(['Added', 'Changed', 'Fixed', 'Removed']),
  }),
});

export const WIKI_SECTIONS = {
  'getting-started': 'Getting started',
  'jobs-economy': 'Jobs economy',
  commands: 'Commands',
  experiments: 'Experiments',
} as const;

const wiki = defineCollection({
  loader: glob({ pattern: '*.md', base: `${CONTENT}/wiki`, generateId }),
  schema: z.object({
    ...base,
    section: z.enum(['getting-started', 'jobs-economy', 'commands', 'experiments']),
    summary: z.string(),
  }),
});

export const collections = { rules, buildlog, wiki };
