# 0001: Static site built with Astro

Status: accepted (2026-10-09)

## Context

The site needs a static-first site: pages are rendered to HTML, minimal client JavaScript, readable with JavaScript off, content (rules, wiki, build log) kept as markdown files, and a Thai and English version of each page. The simplest stack that does this should win. Accounts, linking and stats arrive later and need a backend, but those are separate services (Supabase for auth and data), not a reason to make the whole site a server-rendered app.

## Decision

- **Astro** (static output) with TypeScript. Pages are `.astro` files; markdown content will use Astro content collections. Interactive bits (copy address, legacy toggle, mobile menu, wiki search, leaderboard refresh) are small scripts, not a UI framework.
- **Plain CSS** with design tokens as CSS custom properties (`src/styles/tokens.css`). No CSS framework.
- **Fonts** are self-hosted through Fontsource (Geist, Geist Mono, IBM Plex Sans Thai) with system fallbacks, so text is never blocked by a font download and no request goes to a third party.
- **Build format `file`** (`/store` is `store.html`) and no trailing slash, so the static host serves clean URLs.
- **Config** values used by more than one page (site URL, server address, Discord invite, nav links) live in `src/config.ts`.
- **Tests** are Playwright against the built site, with axe for accessibility, as the spec's single test seam.
- **Account features** (later) call Supabase from the browser or from small server functions; they do not change the static build of the other pages.

## Consequences

- Any static host works (Cloudflare Pages, Netlify, GitHub Pages, S3). Hosting is not chosen yet.
- Real server-side code, when needed, goes in separate functions or services instead of turning every page into a dynamic route.
- Stub routes in `src/pages/[...stub].astro` keep every nav and footer link working until each page is built.
- If we later need per-request rendering (for example private account pages), Astro can add an adapter for those routes only.
