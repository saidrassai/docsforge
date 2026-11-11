# Framework adapters

DocsForge does not force one documentation framework on every project.

## Selection order

1. Preserve a working Help Center.
2. Next.js → evaluate **Fumadocs** first.
3. Other React framework → evaluate Docusaurus, Nextra, Starlight, or
   VitePress.
4. Python-oriented → evaluate **MkDocs** (Material theme).
5. Independent documentation product → dedicated static site.
6. No customer-facing UI → do not install a Help Center.

## Matrix

| Adapter | Use when | Content root | Strengths |
| --- | --- | --- | --- |
| `existing-docs` | A working Help Center exists | Existing | No migration; stable URLs |
| `nextjs-fumadocs` | Next.js application | `content/docs/` | Native Next.js, MDX, search, TOC |
| `react` | React/Vue/Astro without a docs stack | Framework-specific | Docusaurus, Nextra, Starlight, VitePress |
| `python-mkdocs` | Python API/CLI/library or standalone docs | `docs/` | Python-native, search, Material |
| `nodejs` | Node API/CLI/library | `docs/` | Keep docs close to code |
| `static-site` | Docs independent from the app | `docs/` | Full control, independent deploy |
| `none` | No customer UI | — | No unnecessary Help Center or browser harness |

## Next.js + Fumadocs

Preferred for Next.js.

Typical layout:

```text
content/docs/
  index.mdx
  getting-started/
  guides/
  concepts/
  troubleshooting/
source.config.ts
lib/source.ts
app/docs/layout.tsx
app/docs/[[...slug]]/page.tsx
mdx-components.tsx
```

Before scaffolding:

- confirm the Next.js version and router;
- check for an existing `/docs` route, middleware, or rewrites;
- verify the deployment target;
- decide whether search is local or hosted;
- decide whether versioning is actually required.

DocsForge stages adapter files under `.documentation/adapters/` until the
project confirms route and dependency changes.

## React

| Option | Best for |
| --- | --- |
| Docusaurus | Mature standalone docs, versioning, i18n |
| Nextra | Next.js-native lightweight docs |
| Starlight | Astro projects |
| VitePress | Vue/Nuxt projects |

## Python + MkDocs

Use for Python APIs, CLIs, libraries, or standalone docs.

```sh
python -m venv .venv
. .venv/bin/activate
pip install mkdocs mkdocs-material
mkdocs serve
mkdocs build --strict
```

Pin versions in the project's dependency file for reproducible CI.

## Node.js

For APIs, CLIs, and libraries without a customer browser UI:

- keep `README.md` as the quick start;
- keep task guides in `docs/`;
- generate API references from OpenAPI/TypeScript types where possible;
- capture real CLI output, never invented output;
- do not install a browser Help Center.

## Existing docs

Preserve the current framework unless there is a concrete reason to migrate.

Before migrating:

- inventory URLs and redirects;
- map navigation;
- verify search;
- move content in small batches;
- add redirects for every changed URL;
- keep the old site available until the new one is verified.

## No UI

If the product is an API, CLI, library, background service, or internal system
without a customer browser UI:

- do not install a Help Center;
- do not install Playwright for documentation screenshots;
- do not create fake UI guides;
- mark the domain `NOT APPLICABLE`.

## Adapter source

Adapter guidance lives in the repository:

<https://github.com/saidrassai/docsforge/tree/main/adapters>
