# Scripts and flags

All scripts are dependency-free Node.js ESM and run on Windows, WSL, Linux, and
macOS.

## Scripts

| Script | Purpose |
| --- | --- |
| `docs-toolkit.mjs` | install, sync, status, verify, uninstall, licenses |
| `verify-hosts.mjs` | live OpenCode and OMP catalog verification |
| `self-test.mjs` | isolated end-to-end bootstrap and validation |
| `check-syntax.mjs` | parse-check every Node ESM script |
| `detect-stack.mjs` | Git root, stack, product type, UI, docs framework, CI |
| `init-project.mjs` | project bootstrap and safe merges |
| `validate-config.mjs` | config contract validation |
| `audit-project.mjs` | deterministic documentation audit |
| `docs-impact.mjs` | Git diff → impacted pages, guides, screenshots |
| `lib/yaml.mjs` | minimal YAML subset parser/stringifier |
| `lib/fsutil.mjs` | paths, hashing, backups, Git, host roots, flags |

## `docs-toolkit.mjs`

```sh
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs <command> [flags]
```

Commands:

| Command | Purpose |
| --- | --- |
| `install` | Install managed skills, agents, and commands |
| `sync` | Alias for install; synchronize canonical files |
| `status` | Managed files, drift, OpenWiki/MCP state |
| `verify` | Frontmatter, discovery files, MCP entries |
| `uninstall` | Remove managed files and restore backups |
| `licenses` | License and dependency review |
| `version` | Print toolkit version |

Flags:

| Flag | Purpose |
| --- | --- |
| `--host opencode\|omp\|all` | Target host (default `all`) |
| `--omp-agent-dir <path>` | Target a named OMP profile agent dir |
| `--dry-run` | Show planned actions without writing |
| `--force` | Replace unmanaged/modified files after backup |
| `--json` | JSON output for status/verify |
| `--remove-openwiki` | Also remove OpenWiki integrations and CLI |
| `--purge` | Delete the canonical toolkit after uninstall |
| `--yes` | Confirm destructive operations |

Examples:

```sh
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs install --host all
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs status --json
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs verify
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs uninstall --host omp
```

## `init-project.mjs`

```sh
node ~/.documentation-toolkit/scripts/init-project.mjs --root . [flags]
```

Flags:

| Flag | Purpose |
| --- | --- |
| `--root <path>` | Repository root (default current directory) |
| `--dry-run` | Preview without writing |
| `--force` | Regenerate managed scaffold files |
| `--with-user-docs` / `--no-user-docs` | Override adapter applicability |
| `--with-screenshots` / `--no-screenshots` | Override screenshot setup |
| `--with-ci` / `--no-ci` | Override CI setup |
| `--scaffold-adapter` | Stage framework files under `.documentation/adapters/` |
| `--json` | JSON report |

## `detect-stack.mjs`

```sh
node ~/.documentation-toolkit/scripts/detect-stack.mjs --root . --json
```

Reports Git, project metadata, languages, frameworks, database, E2E, docs
frameworks, monorepo signals, UI, routes, OpenWiki state, CI, and
recommendations.

## `validate-config.mjs`

```sh
node ~/.documentation-toolkit/scripts/validate-config.mjs --root . --json
```

Exit codes:

| Code | Meaning |
| --- | --- |
| 0 | Valid |
| 1 | Invalid |
| 2 | Missing config or invocation error |

## `audit-project.mjs`

```sh
node ~/.documentation-toolkit/scripts/audit-project.mjs --root . --json
```

Flags:

| Flag | Purpose |
| --- | --- |
| `--domain full\|engineering\|customer\|screenshots` | Scope |
| `--json` | JSON output |
| `--no-write` | Do not write report files |
| `--root <path>` | Repository root |

The audit writes reports to:

```text
.documentation/audit/<date>-<scope>.md
.documentation/audit/<date>-<scope>.json
```

Exit code is `1` for human output when CRITICAL/HIGH findings exist; `--json`
exits `0` so CI can capture the report.

## `docs-impact.mjs`

```sh
node ~/.documentation-toolkit/scripts/docs-impact.mjs --root . --base origin/main --json
```

Reports changed files by category, impacted routes, wiki pages, guides, and
screenshot inventory entries.

## `verify-hosts.mjs`

```sh
node ~/.documentation-toolkit/scripts/verify-hosts.mjs
```

Asks OpenCode and OMP for their live catalogs. It requires the hosts to be
installed and available on `PATH`.

## `self-test.mjs`

```sh
node ~/.documentation-toolkit/scripts/self-test.mjs
```

Creates a temporary Git repository, initializes DocsForge, validates config,
runs the audit, tests impact mapping, and confirms no writes occur outside the
target repository.

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Success / valid |
| 1 | Validation or audit found blocking errors |
| 2 | Invalid invocation, missing target, or unexpected error |

## Wrappers

POSIX:

```sh
./scripts/status.sh
./scripts/verify.sh
./scripts/sync.sh
./scripts/uninstall.sh
```

PowerShell:

```powershell
.\scripts\status.ps1
.\scripts\verify.ps1
.\scripts\sync.ps1
.\scripts\uninstall.ps1
```
