# Adapter matrix

| Adapter | Detect | Install scope | Content root | Strengths | Cautions |
| --- | --- | --- | --- | --- | --- |
| Existing docs | `docs/`, `documentation/`, `content/docs/`, framework config | Preserve | Existing | No migration, existing URLs | May be stale or structurally weak |
| Fumadocs | Next.js + no docs framework | Project | `content/docs/` | Native Next.js, MDX, search, TOC | Route collisions; version compatibility |
| Nextra | Next.js + Nextra dependency | Project | `pages/` or `content/` | Simple MDX, Next.js | Smaller ecosystem than Fumadocs |
| Docusaurus | React/standalone | Project | `docs/` | Mature, versioning, i18n | Separate build from app |
| Starlight | Astro | Project | `src/content/docs/` | Fast static, accessible | Astro-specific |
| VitePress | Vue/Nuxt | Project | `docs/` | Fast, Markdown-first | Vue-centric theming |
| MkDocs Material | Python or standalone | Project | `docs/` | Python-native, search, plugins | Python build environment |
| Static site | Any, docs independent | Project | `docs/` | Full control | More maintenance |
| None | CLI/API/library without UI | — | In-repo Markdown | No unnecessary stack | Do not force a Help Center |

## Detection signals

- `next.config.*` + `next` dependency → Next.js
- `fumadocs-*`, `source.config.ts` → Fumadocs
- `nextra` → Nextra
- `docusaurus.config.*` → Docusaurus
- `astro.config.*` + `@astrojs/starlight` → Starlight
- `.vitepress/` → VitePress
- `mkdocs.yml` → MkDocs
- `mint.json` / Mintlify config → Mintlify
- `.gitbook.yaml` → GitBook

## Selection prompts

Before scaffolding, answer:

1. Does the app already serve a docs route?
2. Which framework version is installed?
3. Is the deployment static or server-rendered?
4. Is search local or hosted?
5. Does the product need versioned docs?
6. Who writes the docs, and do they know MDX?
7. Can the docs build independently in CI?
