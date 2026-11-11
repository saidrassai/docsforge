# Next.js + Fumadocs

Preferred adapter for Next.js applications.

- Website: <https://www.fumadocs.dev/>
- License: MIT (verify current packages)
- Install scope: application project only
- Content: MDX/Markdown under `content/docs/`
- Render: Next.js App Router (or the router the project already uses)

## Detection

- `next` in dependencies.
- No existing docs framework, or an existing Fumadocs setup.
- `app/` or `pages/` directory.

## Evaluate before installing

1. Next.js version and router.
2. Existing `/docs` route, middleware, rewrites, or catch-all.
3. Deployment target (static export vs Node runtime).
4. Search requirements (local vs hosted).
5. Versioning requirement.
6. Who writes content and whether MDX is acceptable.

## Recommended layout

```text
content/docs/
  index.mdx
  getting-started/
    index.mdx
  guides/
    invite-member.mdx
  concepts/
    roles.mdx
  troubleshooting/
    index.mdx
source.config.ts
lib/source.ts
app/docs/layout.tsx
app/docs/[[...slug]]/page.tsx
mdx-components.tsx
```

## Capabilities to verify

- Sidebar navigation and categories
- Search
- Article page with table of contents
- Related articles
- Responsive layout
- Images with alt text
- Internal links
- Versioning only if the product needs it

## Setup outline

Follow the current Fumadocs documentation for the project's Next.js version.
The general flow is:

1. Add Fumadocs packages to the project.
2. Create `source.config.ts` with the docs collection.
3. Create a loader in `lib/source.ts`.
4. Add the docs layout and page route.
5. Add `mdx-components.tsx` if the project does not already have one.
6. Put content in `content/docs/`.
7. Configure navigation order with frontmatter or meta files.
8. Enable search.
9. Verify the route does not collide with the app.
10. Add redirects if URLs change.

Do not install globally. Do not modify `middleware.ts`, rewrites, or auth
without reviewing the impact on the public docs route.

## Frontmatter

```yaml
---
title: Invite a member
description: Add a teammate and choose their role.
---
```

Use the project's existing fields if it already defines a schema.

## Public safety

- Keep `openwiki/` out of the docs source directory.
- Do not import server-only modules into MDX.
- Do not expose environment variables through `NEXT_PUBLIC_*` unless intended.
- Confirm the docs route is public and indexable.
- Confirm the build does not include internal source maps.

## Validation

```sh
npm run build
npx tsc --noEmit
node .documentation/toolkit/audit-project.mjs --root . --domain user
```

Open `/docs` and verify navigation, search, article rendering, images, and
mobile layout.
