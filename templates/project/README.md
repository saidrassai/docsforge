# Project documentation

This directory is owned by the project, not by the global documentation
toolkit.

- `config.yml` — validated project contract. Do not edit toolkit defaults here;
  override only what this project needs.
- `state.json` — bootstrap metadata (stack, adapter, timestamps).
- `audit/` — audit reports and JSON findings. Internal.
- `screenshots/` — docs-only Playwright config, specs, inventory, and ignored
  artifacts.
- `adapters/` — staged framework setup and the adapter recommendation.

## Domains

| Content | Location | Visibility |
| --- | --- | --- |
| Engineering knowledge | `openwiki/` | Internal |
| Customer guides | see `user_docs.content_directory` | Public |
| Screenshots | `docs/assets/screenshots/` | Public, synthetic data |
| Audit reports | `.documentation/audit/` | Internal |

Never import `openwiki/` into a public docs build. Never put customer data in
screenshots. Never publish without authorization.

## Commands

Run `/docs-init`, `/docs-sync`, `/docs-audit`, `/docs-code`, `/docs-user`, or
`/docs-screenshots` in OpenCode or Oh My Pi.

## Validation

```sh
node ~/.documentation-toolkit/scripts/validate-config.mjs --root .
node ~/.documentation-toolkit/scripts/audit-project.mjs --root . --json
```
