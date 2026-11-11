# Adapter selection

## Decision table

| Project signal | Preferred adapter | Alternatives | Avoid |
| --- | --- | --- | --- |
| Working Help Center already exists | Preserve it | Improve IA/search only | Migration without a concrete reason |
| Next.js App/Pages Router | Fumadocs | Nextra, Docusaurus, Starlight | A second React app for docs |
| React + Vite SPA | Docusaurus or Starlight | VitePress, Fumadocs static | Forcing Next.js |
| Vue/Nuxt | VitePress | Starlight | React-only tools |
| Astro | Starlight | VitePress | Duplicate docs stack |
| Python app/library | MkDocs Material | Sphinx | Node-only stack |
| Node API/CLI/library | MkDocs, Docusaurus, or in-repo Markdown | Starlight | A Help Center with no UI |
| No customer UI | Reference docs only | — | Browser screenshot harness |
| Documentation is a separate product | Dedicated static site | Starlight/Docusaurus | Coupling to app release cycle |

## Evaluation criteria

1. **Rendering model** — does it fit the app's framework and hosting?
2. **Content format** — MDX vs Markdown; can writers work safely?
3. **Navigation** — sidebar, categories, ordering, breadcrumbs.
4. **Search** — built-in/local search, no paid dependency.
5. **Versioning** — only if the product actually supports multiple versions.
6. **Theming** — can it match the product without heavy custom code?
7. **Maintenance** — active project, permissive license, small dependency
   surface.
8. **Deployment** — static export or same-origin route; no vendor lock-in.
9. **Accessibility** — keyboard navigation, semantic headings, alt text.
10. **Migration cost** — existing content, redirects, URLs.

## Safety checks before scaffolding

- Does the route collide with an existing app route?
- Does the framework require a specific Next.js/React/Vue version?
- Will it modify `package.json`, lockfiles, middleware, or build output?
- Does it need a server runtime the deployment target lacks?
- Will it expose internal files through the public build?
- Is the docs root already used by another tool?

Scaffold into a staged directory when uncertain. Do not install dependencies or
change application routes without explicit confirmation.
