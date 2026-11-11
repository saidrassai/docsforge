# Scripts

All scripts are dependency-free Node.js ESM and run on Windows, WSL, Linux, and
macOS. Use `node` directly or the provided wrappers.

| Script | Purpose |
| --- | --- |
| `docs-toolkit.mjs` | install, sync, status, verify, uninstall, licenses |
| `verify-hosts.mjs` | live discovery check for OpenCode and OMP catalogs |
| `self-test.mjs` | isolated end-to-end bootstrap and validation test |
| `check-syntax.mjs` | parse-check every Node ESM script |
| `detect-stack.mjs` | detect Git root, stack, product type, docs framework, CI, UI |
| `init-project.mjs` | project bootstrap: config, OpenWiki brief, user docs, Playwright, CI, AGENTS.md |
| `validate-config.mjs` | validate `.documentation/config.yml` without dependencies |
| `audit-project.mjs` | deterministic engineering/customer/screenshot audit |
| `docs-impact.mjs` | map a Git diff to impacted OpenWiki pages, guides, screenshots |
| `lib/yaml.mjs` | minimal YAML subset parser/stringifier |
| `lib/fsutil.mjs` | paths, hashing, backups, Git, host roots, flags |
| `install.sh` / `sync.sh` / `status.sh` / `verify.sh` / `uninstall.sh` | POSIX wrappers |
| `install.ps1` / `sync.ps1` / `status.ps1` / `verify.ps1` / `uninstall.ps1` | PowerShell wrappers |

## Common commands

```sh
node scripts/docs-toolkit.mjs status
node scripts/docs-toolkit.mjs verify
node scripts/verify-hosts.mjs
node scripts/self-test.mjs
node scripts/detect-stack.mjs --root . --json
node scripts/init-project.mjs --root . --dry-run
node scripts/validate-config.mjs --root .
node scripts/audit-project.mjs --root . --json
node scripts/docs-impact.mjs --root . --base HEAD~1 --json
```

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Success / valid |
| 1 | Validation or audit found blocking errors |
| 2 | Invalid invocation, missing target, or unexpected error |

## Safety

- `init-project.mjs` refuses to write outside a Git root.
- `docs-toolkit.mjs` backs up before overwriting and skips unmanaged conflicts
  unless `--force` is passed.
- `audit-project.mjs` never rewrites documentation.
- No script commits, pushes, publishes, or deploys.
