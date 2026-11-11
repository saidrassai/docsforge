# Public documentation safety

Public user documentation must not leak engineering internals or customer data.

## Never publish

- Source paths, internal package names, class names, or database tables
- API keys, tokens, cookies, connection strings, or `.env` values
- Internal prompts, model names used privately, or agent instructions
- Feature flags, experiment IDs, or rollout internals
- Admin/support runbooks or escalation procedures
- Production customer names, emails, screenshots, or logs
- Security weaknesses or unresolved vulnerability details
- Internal architecture diagrams
- Staging URLs or private dashboards

## Pre-publish checks

1. Build the public docs output.
2. Search the output for `openwiki`, `src/`, `internal`, `secret`, `token`,
   `password`, `api_key`, and the repository's private domain names.
3. Confirm no internal route is linked.
4. Confirm screenshots use synthetic data and have alt text.
5. Confirm the docs route is intended to be public (middleware, auth, robots).
6. Confirm `sitemap.xml` and canonical URLs.
7. Confirm no source maps or `.env` files are served.
8. Review the diff with a second person for security-sensitive products.

## Separation

| Content | Location | Visibility |
| --- | --- | --- |
| Architecture, APIs, schema, runbooks | `openwiki/` | Internal |
| Customer guides | `docs/user/` or existing Help Center | Public |
| Screenshots | `docs/assets/screenshots/` | Public, synthetic data |
| Audit reports | `.documentation/audit/` | Internal |
| CI config | `.github/` / `.gitlab-ci.yml` | Internal |

Never import from `openwiki/` into a public docs build. Never symlink a public
route to an internal directory.
