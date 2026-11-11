# Troubleshooting

## Skills

### OpenCode does not see a DocsForge skill

Check:

```text
~/.config/opencode/skills/<id>/SKILL.md
```

Requirements:

- the directory contains `SKILL.md`;
- frontmatter includes `description`;
- the skill ID matches the directory name.

Fix:

```sh
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs sync --host opencode
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs verify
```

### OMP does not see a DocsForge skill

OMP validates skill names strictly:

- `name` must match the directory;
- lowercase kebab-case;
- no consecutive hyphens;
- non-empty description ≤ 1024 characters.

Check:

```text
~/.omp/agent/skills/<name>/SKILL.md
```

Then:

```sh
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs sync --host omp
```

## Commands

### A `/docs-*` command is missing

Check the host command directory:

```text
~/.config/opencode/commands/
~/.omp/agent/commands/
```

Then run `sync` and `verify`.

Both hosts support markdown commands. If a host cannot expose a command, use
the corresponding skill directly.

## OpenWiki

### OpenWiki MCP is missing

```sh
openwiki integrations list
```

If a host is `not-installed`:

```sh
openwiki integrations install opencode
openwiki integrations install omp
```

Inspect:

- `~/.config/opencode/opencode.jsonc`
- `~/.omp/agent/mcp.json`

### OpenWiki generation fails in CI

Interactive agent credentials are not available to unattended runners.

Set the provider secret and variables documented in
[CI automation](../guides/automation.md).

### `openwiki_begin` returns `noop`

The repository has no changes requiring a wiki update. Report that no update is
required and stop.

### Claims are stale

Recheck current source. Do not automatically retract:

- still true → confirm the Claim;
- changed → revise it with new evidence;
- removed → correct the prose and retract it.

### An OpenWiki run was interrupted

`.run.json` remains. Resume the durable queue. Do not delete run state while a
run is active.

## Screenshots

### Authentication fails

- Use a dedicated test user.
- Set `DOCS_USER_EMAIL` and `DOCS_USER_PASSWORD`.
- Save `storageState` in `.documentation/screenshots/.auth/`.
- Do not use production credentials.

### Screenshot is the wrong size

If you spread a Playwright device preset, set `viewport` after the spread:

```ts
use: {
  ...devices["Desktop Chrome"],
  viewport: { width: 1440, height: 900 },
}
```

### Dynamic content changes every run

Mask timestamps, IDs, avatars, and counts:

```ts
await page.screenshot({
  path: "...",
  mask: [page.getByTestId("current-time"), page.getByTestId("user-avatar")],
  maskColor: "#e5e7eb",
});
```

### Screenshot references are broken

Run:

```sh
node ~/.documentation-toolkit/scripts/audit-project.mjs --root . --domain screenshots
```

Check the inventory paths, guide image paths, and actual files.

## Configuration

### Config validation fails

```sh
node ~/.documentation-toolkit/scripts/validate-config.mjs --root . --json
```

Common causes:

- `codebase.engine` is not `openwiki`;
- `screenshots.engine` is not `playwright`;
- a path is absolute or escapes the repository;
- `version` is not `1`.

## Windows

### PowerShell blocks a wrapper

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\status.ps1
```

or:

```powershell
Unblock-File .\scripts\status.ps1
```

### OpenWiki native dependency fails

Install with npm or pnpm, not Bun. If `better-sqlite3` has no matching prebuilt
binary, install Visual Studio Build Tools with the Desktop development with C++
workload.

## Installation state

### Hash drift after editing an installed file

Installed copies are generated artifacts. Put changes in the canonical toolkit,
then:

```sh
node scripts/docs-toolkit.mjs sync --host all
```

### An unmanaged file was skipped

DocsForge does not overwrite files it did not create. Re-run with `--force` to
back up and replace the file.

### Wrong OMP profile

Check:

- `OMP_PROFILE`
- `PI_CODING_AGENT_DIR`
- `~/.omp/profiles/<name>/agent`

Target a profile explicitly:

```sh
node scripts/docs-toolkit.mjs install --host omp \
  --omp-agent-dir ~/.omp/profiles/work/agent
```

## Logs

- OpenCode: `~/.local/share/opencode/log/opencode.log`
- OMP: `~/.omp/logs/`

Do not delete databases, session state, or service registration while
diagnosing.
