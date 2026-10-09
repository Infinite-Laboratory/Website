# Infinite Laboratory website

The website for Infinite Laboratory, a community-driven, cross-platform (Java and Bedrock) Minecraft studio. Static site built with [Astro](https://astro.build); see `docs/adr/0001-static-site-with-astro.md` for the stack.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm test           # builds, serves and runs Playwright + axe
```

Layout: `src/config.ts` (shared values), `src/layouts`, `src/components`, `src/styles/tokens.css` (design tokens), `src/pages`, `tests/`.

## Deploying to GitHub Pages

Every push to `main` builds the site and publishes it to GitHub Pages (`.github/workflows/deploy.yml`). The site is served from `https://<owner>.github.io/<repo>/`, so the build sets `SITE_URL` and `BASE_PATH`; every internal link and asset goes through `withBase()` in `src/lib/url.ts`. Never hard-code a root-absolute link in a page.

To build the same way locally: `SITE_URL=https://infinite-laboratory.github.io BASE_PATH=/Website npm run build`. Once the real domain is chosen, set it as the Pages custom domain and drop `BASE_PATH`.

## License

The source code is MIT licensed (see `LICENSE`). The Infinite Laboratory name, logo, goggles mark and other brand assets are **not** covered by that license: all rights reserved. Please do not reuse them to suggest an official connection.
