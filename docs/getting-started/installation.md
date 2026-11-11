# Installation

DocsForge is installed once per machine, then initialized separately inside each
repository.

## Requirements

| Requirement | Notes |
| --- | --- |
| Node.js **≥ 22.22.0** | Required by OpenWiki |
| Git | DocsForge refuses to write outside a Git root |
| OpenCode 2.x and/or Oh My Pi 18.x | At least one host |
| npm or pnpm | For OpenWiki and project dependencies |
| Playwright | Only when a project has a browser UI |

Windows notes:

- Use **npm** or **pnpm** for OpenWiki, not Bun, because of native dependency
  compatibility.
- PowerShell wrappers are provided. No administrator rights or symlinks are
  required.
- The canonical install directory is `~/.documentation-toolkit` on every
  platform, including Windows.

## 1. Clone the toolkit

```sh
git clone https://github.com/saidrassai/docsforge.git ~/.documentation-toolkit
```

PowerShell:

```powershell
git clone https://github.com/saidrassai/docsforge.git "$HOME\.documentation-toolkit"
```

If the directory already exists:

```sh
cd ~/.documentation-toolkit
git pull
```

## 2. Install into your agents

```sh
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs install --host all
```

PowerShell:

```powershell
node "$HOME\.documentation-toolkit\scripts\docs-toolkit.mjs" install --host all
```

This installs:

| Host | Skills | Agents | Commands |
| --- | --- | --- | --- |
| OpenCode | `~/.config/opencode/skills/` | `~/.config/opencode/agents/` | `~/.config/opencode/commands/` |
| Oh My Pi | `~/.omp/agent/skills/` | `~/.omp/agent/agents/` | `~/.omp/agent/commands/` |

Copies are used instead of symlinks so the same install works on Windows
without Developer Mode.

Existing files that DocsForge did not create are skipped unless you pass
`--force`. With `--force`, they are backed up first.

## 3. Install OpenWiki and host integrations

```sh
npm install -g openwiki

openwiki integrations install opencode
openwiki integrations install omp
```

OpenWiki installs:

- a skill in each host;
- an MCP server entry in each host;
- its CLI on `PATH`.

Verify:

```sh
openwiki integrations list
```

Expected:

```text
opencode  installed  OpenCode
omp       installed  Oh My Pi
```

## 4. Verify DocsForge

```sh
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs status
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs verify
node ~/.documentation-toolkit/scripts/verify-hosts.mjs
node ~/.documentation-toolkit/scripts/self-test.mjs
```

| Command | Checks |
| --- | --- |
| `status` | Managed files, hashes, drift, OpenWiki/MCP state |
| `verify` | Frontmatter, names, commands, agents, MCP entries |
| `verify-hosts` | Live OpenCode and OMP catalogs |
| `self-test` | Isolated end-to-end bootstrap and audit |

`verify-hosts` asks each host for its live catalog and confirms:

- all six skills;
- all six `docs-*` commands;
- all four agents;
- the OpenWiki MCP integration.

## Windows

Use the same Node commands. PowerShell wrappers are available:

```powershell
.\scripts\install.ps1
.\scripts\status.ps1
.\scripts\verify.ps1
.\scripts\sync.ps1
.\scripts\uninstall.ps1
```

If Windows blocks local scripts:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\status.ps1
```

or:

```powershell
Unblock-File .\scripts\install.ps1
```

## Upgrade

```sh
cd ~/.documentation-toolkit
git pull
node scripts/docs-toolkit.mjs sync --host all
node scripts/docs-toolkit.mjs verify
```

`sync` updates managed skills, agents, and commands. It backs up the previous
version and reports any hash drift.

## Uninstall

See [Uninstall and backups](../operations/uninstall.md).

## Troubleshooting

See [Troubleshooting](../operations/troubleshooting.md).
