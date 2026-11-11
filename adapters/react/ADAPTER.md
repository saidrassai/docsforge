# React documentation adapters

Use when the application is React-based but not Next.js, or when a separate
docs site is a better fit.

## Options

| Option | Best for | Content | Notes |
| --- | --- | --- | --- |
| Docusaurus | Mature standalone docs | `docs/` MDX | Versioning, i18n, plugin ecosystem; React |
| Nextra | Next.js projects | `pages/` or `content/` MDX | Lightweight, Next.js-native |
| Starlight | Astro projects | `src/content/docs/` | Fast static, accessible defaults |
| VitePress | Vue/Nuxt projects | `docs/` Markdown | Fast, Vue theming |
| Fumadocs static | Next.js with static export | `content/docs/` | Only if the app already uses Next.js |

## Selection

1. If the app is Next.js, prefer Fumadocs unless an existing framework works.
2. If the app is Vite + React, Docusaurus or Starlight avoids forcing a Next.js
   runtime.
3. If the app is Vue/Nuxt, VitePress.
4. If the app is Astro, Starlight.
5. If docs must be versioned independently, Docusaurus is a strong default.

## Rules

- Keep docs in a separate build target when possible.
- Do not duplicate the application's design system; theme the docs to match.
- Use the framework's search rather than adding a paid service.
- Add redirects for moved URLs.
- Keep images under the docs static directory.
- Validate the production build, not only the dev server.
- Review the license and dependency tree before adding plugins.

## Migration from an existing docs site

1. Inventory URLs and redirects.
2. Preserve slugs where possible.
3. Migrate content in small batches.
4. Add redirects for every changed URL.
5. Verify search and navigation.
6. Keep the old site available until the new one is verified.
