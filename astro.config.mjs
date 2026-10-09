import { defineConfig } from 'astro/config';
import { SITE_URL } from './src/config.ts';

// SITE_URL and BASE_PATH are set by the GitHub Pages workflow
// (https://infinite-laboratory.github.io + /Website). Locally the site is served from "/".
export default defineConfig({
  site: process.env.SITE_URL || SITE_URL,
  base: process.env.BASE_PATH || '/',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
});
