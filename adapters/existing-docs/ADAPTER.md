# Existing documentation framework

The first choice is always to preserve a working Help Center.

## Procedure

1. Identify the framework and version.
2. Identify the content root and URL mapping.
3. Build and serve the current site.
4. Audit navigation, search, links, and mobile layout.
5. Map existing content to the customer-docs structure.
6. Improve content and information architecture before migrating.
7. Migrate only for a concrete reason: unsupported framework, security issue,
   unusable authoring workflow, or missing required capability.

## Detection

- `mkdocs.yml`
- `docusaurus.config.*`
- `source.config.ts` / Fumadocs packages
- `nextra.config.*`
- `astro.config.*` + Starlight
- `.vitepress/config.*`
- `mint.json` / `docs.json`
- `.gitbook.yaml`

## Rules

- Do not break existing URLs.
- Add redirects for every moved page.
- Preserve search configuration.
- Keep the existing theme unless it blocks accessibility or maintenance.
- Do not duplicate content across old and new sites.
- Verify the production build.
- Document the framework's authoring conventions for the team.

## Migration checklist

- [ ] URL inventory and redirect map
- [ ] Content inventory and ownership
- [ ] Navigation mapping
- [ ] Search verification
- [ ] Image migration
- [ ] Analytics/canonical URLs
- [ ] Accessibility check
- [ ] Production build
- [ ] Rollback plan
