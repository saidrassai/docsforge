# Static documentation site

Use when documentation is independent from the application, or when no existing
framework fits.

## Options

- Astro Starlight
- Docusaurus
- VitePress
- Plain Markdown + a static host

## Rules

- Separate build from the application unless same-origin routing is a
  requirement.
- Keep the docs deploy independent so documentation can ship without an app
  release.
- Use a permissive, actively maintained framework.
- Avoid paid search or hosting dependencies unless the project already uses
  them.
- Add redirects for moved URLs.
- Pin dependencies and build in CI.

## Layout

```text
docs-site/
  package.json
  src/content/docs/       # Starlight
  docs/                   # Docusaurus/VitePress
  public/
```

## Deployment

- GitHub Pages, GitLab Pages, Cloudflare Pages, Netlify, Vercel, or the
  project's existing host.
- Set the correct base path if hosted under a subpath.
- Configure `site_url` / canonical URLs.
- Add a sitemap and `robots.txt`.
- Ensure the build fails on broken internal links where supported.

## Validation

```sh
npm run build
node .documentation/toolkit/audit-project.mjs --root . --domain user
```

Preview the production build, not only the dev server.
