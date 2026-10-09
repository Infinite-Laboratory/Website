# Infinite Laboratory website

The website for Infinite Laboratory, a community-driven, cross-platform (Java and Bedrock) Minecraft studio. Static site built with [Astro](https://astro.build); see `docs/adr/0001-static-site-with-astro.md` for the stack.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm test           # builds, serves and runs Playwright + axe
```

Layout: `src/config.ts` (shared values), `src/layouts`, `src/components`, `src/styles/tokens.css` (design tokens), `src/pages`, `tests/`.

## License

The source code is MIT licensed (see `LICENSE`). The Infinite Laboratory name, logo, goggles mark and other brand assets are **not** covered by that license: all rights reserved. Please do not reuse them to suggest an official connection.
