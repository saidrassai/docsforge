# Schemas

| Schema | Purpose |
| --- | --- |
| `config.schema.json` | `.documentation/config.yml` project contract |
| `user-doc-frontmatter.schema.json` | Recommended customer-article frontmatter |

The runtime validator is `scripts/validate-config.mjs`. It implements the same
constraints without external dependencies and additionally checks that paths
stay inside the repository.

Run:

```sh
node ~/.documentation-toolkit/scripts/validate-config.mjs --root . --json
```

Validation is intentionally forward-compatible: unknown keys produce warnings,
not hard failures, so projects can add fields without waiting for a toolkit
release. Dangerous security values produce warnings and are checked by the
auditor.
