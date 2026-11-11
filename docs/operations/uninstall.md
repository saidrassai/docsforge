# Uninstall and backups

DocsForge keeps installation state in:

```text
~/.documentation-toolkit/state/install-manifest.json
```

The manifest records every managed file, its source, its SHA-256 hash, and its
host root.

## Remove managed host files

```sh
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs uninstall --host all
```

This:

- removes only manifest-managed files;
- restores the matching pre-install backup for the same host root;
- leaves project documentation untouched;
- leaves unrelated host configuration untouched.

## Remove OpenWiki too

```sh
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs uninstall --host all \
  --remove-openwiki --yes
```

This runs the OpenWiki integration uninstall for each host and then:

```sh
npm uninstall -g openwiki
```

It does not delete project wikis.

## Delete the toolkit

```sh
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs uninstall --host all \
  --purge --yes
```

This deletes the canonical toolkit directory, including backups. Use it only
when you are sure.

## What uninstall does not delete

- `<repo>/openwiki/`
- `<repo>/docs/`
- `<repo>/.documentation/`
- user-created skills, agents, or commands
- OpenCode or OMP session data
- project Git history

## Backups

Pre-install configuration backup:

```text
~/.documentation-toolkit/backups/<timestamp>/
  opencode/opencode.jsonc
  opencode/agents/
  opencode/commands/
  omp/config.yml
  omp/mcp.json
  claude/settings.json
```

Markers:

| File | Points to |
| --- | --- |
| `CONFIG-LATEST.txt` | Pre-install configuration backup |
| `MANAGED-LATEST.txt` | Latest managed-file backup |
| `LATEST.txt` | Pre-install configuration backup |

Backups record the host root in `metadata.json`. Restore is scoped to that root,
so named OMP profiles and relocated config directories cannot restore each
other’s files.

## Manual restore

Copy the desired file from the matching timestamp directory:

```sh
cp ~/.documentation-toolkit/backups/<timestamp>/opencode/opencode.jsonc \
   ~/.config/opencode/opencode.jsonc
```

On Windows:

```powershell
Copy-Item "$HOME\.documentation-toolkit\backups\<timestamp>\opencode\opencode.jsonc" `
  "$HOME\.config\opencode\opencode.jsonc"
```

## Force removal

If a managed file was edited after installation, uninstall skips it by default.
Re-run with `--force` to remove it.

```sh
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs uninstall --host all --force
```
