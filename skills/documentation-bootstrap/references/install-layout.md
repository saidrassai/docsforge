# Install layout

## Host roots

### OpenCode V2

| Purpose | Path |
| --- | --- |
| Global config | `~/.config/opencode/opencode.json(c)` |
| Skills | `~/.config/opencode/skills/<id>/SKILL.md` |
| Agents | `~/.config/opencode/agents/<name>.md` |
| Commands | `~/.config/opencode/commands/<name>.md` |
| Compatibility skills | `~/.claude/skills`, `~/.agents/skills` |

`XDG_CONFIG_HOME` relocates the config root on Linux/macOS.

### Oh My Pi

| Purpose | Path |
| --- | --- |
| Default agent dir | `~/.omp/agent/` |
| Skills | `~/.omp/agent/skills/<name>/SKILL.md` |
| Agents | `~/.omp/agent/agents/<name>.md` |
| Commands | `~/.omp/agent/commands/<name>.md` |
| MCP | `~/.omp/agent/mcp.json` |
| Settings | `~/.omp/agent/config.yml` |
| Rules | `~/.omp/agent/rules/` |
| Instructions | `~/.omp/agent/AGENTS.md` |

Named profiles: `~/.omp/profiles/<name>/agent/`.
`PI_CODING_AGENT_DIR` and `OMP_PROFILE` relocate state.

## Managed files

The manifest records:

```json
{
  "version": "1.0.0",
  "installedAt": "2026-11-11T14:20:00.000Z",
  "hosts": {
    "opencode": {
      "root": "/home/user/.config/opencode",
      "files": {
        "skills/docs-orchestrator/SKILL.md": {
          "source": "skills/docs-orchestrator/SKILL.md",
          "sha256": "..."
        }
      }
    }
  }
}
```

Backups also record the host root in `metadata.json`; restore only applies to
the same root, so a named OMP profile or relocated config cannot restore another
profile's file.

## Backup layout

```text
~/.documentation-toolkit/backups/<timestamp>/
  opencode/
    opencode.jsonc
    agents/
    commands/
  omp/
    config.yml
    mcp.json
  claude/
    settings.json
```

A backup is taken before the first modification in an install/sync/uninstall
operation. Restores are per-file and never delete unrelated content.

## What uninstall does not touch

- `<repo>/openwiki/`
- `<repo>/docs/`
- `<repo>/.documentation/`
- OpenWiki global npm package (unless `--remove-openwiki`)
- Host MCP entries owned by OpenWiki
- User-created skills, agents, commands
- Session history and databases
