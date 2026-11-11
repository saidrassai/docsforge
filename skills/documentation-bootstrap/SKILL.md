---
name: documentation-bootstrap
description: Install, verify, upgrade, back up, and uninstall the global DocsForge toolkit, and bootstrap documentation infrastructure inside a repository. Use when setting up docs for a new project, repairing discovery, synchronizing global skills and commands, selecting a Help Center adapter, adding documentation policy to AGENTS.md, or configuring CI.
license: MIT
compatibility: OpenCode, Oh My Pi, Agent Skills
---

# Documentation Bootstrap

You maintain the global toolkit and initialize projects. You do not put
project-specific documentation inside the toolkit.

## Part A — Global toolkit operations

### Canonical location

```text
~/.documentation-toolkit/
```

Override with `DOCS_TOOLKIT_HOME`.

### Inspect first

```sh
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs status
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs verify
node ~/.documentation-toolkit/scripts/verify-hosts.mjs
node ~/.documentation-toolkit/scripts/self-test.mjs
openwiki integrations list
```

`status` reports:

- toolkit version;
- host roots;
- managed files and hash drift;
- OpenWiki CLI/integration state;
- MCP configuration presence.

`verify` checks:

- skill frontmatter and OMP name rules;
- command files;
- agent files;
- host discovery paths;
- MCP server entries.

### Install or synchronize

```sh
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs install --host all
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs sync --host all
```

Options:

- `--host opencode|omp|all`
- `--dry-run`
- `--force`
- `--omp-agent-dir <path>` for a named OMP profile

The installer:

1. Resolves host roots from the environment and current official layouts.
2. Backs up any existing file it will overwrite.
3. Generates host-compatible skills, agents, and commands.
4. Writes `state/install-manifest.json` with SHA-256 hashes.
5. Never touches unrelated files.

### Upgrade

1. Read `CHANGELOG.md`.
2. Back up state (automatic on install).
3. Replace toolkit files.
4. Run `sync --host all`.
5. Run `verify`.
6. Re-run a project audit in one validation repository.

### Uninstall

```sh
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs uninstall --host all
```

- Removes only manifest-managed files.
- Restores the most recent backup for files that existed before installation.
- Leaves project documentation untouched.
- Leaves OpenWiki installed unless `--remove-openwiki` is passed.
- `--purge` may delete the canonical toolkit; require explicit confirmation.

### Windows

Use the PowerShell wrappers:

```powershell
.\scripts\install.ps1
.\scripts\sync.ps1
.\scripts\status.ps1
.\scripts\verify.ps1
.\scripts\uninstall.ps1
```

They call `node` with the same arguments. No Bash, symlinks, or administrator
rights are required.

## Part B — Project initialization

### Preconditions

1. The target is a Git repository. Confirm:

   ```sh
   git rev-parse --show-toplevel
   ```

2. The current directory is inside that root.
3. You have permission to create files.
4. Existing documentation and instructions are identified.

Never run project initialization from the global toolkit directory and never
target another checkout without an explicit path and confirmation.

### Preview

```sh
node ~/.documentation-toolkit/scripts/init-project.mjs --root . --dry-run
```

Review:

- detected stack and product type;
- existing docs framework;
- proposed user-docs adapter;
- screenshot applicability;
- CI host;
- files to create or merge.

### Initialize

```sh
node ~/.documentation-toolkit/scripts/init-project.mjs --root .
```

Options:

- `--with-user-docs` / `--no-user-docs`
- `--with-screenshots` / `--no-screenshots`
- `--with-ci` / `--no-ci`
- `--scaffold-adapter` (stage framework files; no dependency install)
- `--force` (replace managed files; still preserves unrelated content)

### What gets created

```text
.documentation/
  config.yml
  README.md
  user-docs.md
  templates/user-guide.md
  state.json
  audit/
  screenshots/
    inventory.yml
    README.md
    specs/
  adapters/
    recommendation.md
  toolkit/                 # project-local copies for CI validation
openwiki/
  INSTRUCTIONS.md
.openwikiignore
docs/
  <content_directory>/
  assets/screenshots/
playwright.docs.config.ts        # only when a browser UI exists
AGENTS.md                        # managed block appended/merged
.github/workflows/docs-*.yml    # only for GitHub repositories
```

The initializer must not:

- install Fumadocs/MkDocs/Docusaurus globally;
- overwrite existing `openwiki/` content;
- replace existing `AGENTS.md` instructions;
- create a second CI system;
- generate fake guides, screenshots, or architecture facts;
- modify application source.

### Adapter selection

Use `adapters/` and the decision order in `user-documentation`:

1. Preserve a working Help Center.
2. Next.js → Fumadocs.
3. Other React → framework-compatible tool.
4. Python → MkDocs.
5. Independent docs → static site.
6. No UI → no Help Center.

Stage framework files under `.documentation/adapters/` until the user confirms
route/dependency changes.

### AGENTS.md merge

The managed block is:

```md
<!-- DOCUMENTATION:START -->
## Documentation

- Read `.documentation/config.yml` before documentation work.
- Engineering knowledge lives in `openwiki/`; customer guides live in the
  configured user-docs directory. Keep them separate.
- After meaningful implementation changes, update affected documentation and
  screenshots; report impact.
- Never fabricate screenshots or product behavior.
<!-- DOCUMENTATION:END -->
```

Rules:

- Preserve all text outside the markers byte-for-byte.
- Replace only the managed block on re-run.
- If markers are malformed or duplicated, stop and ask.
- OMP and OpenCode both read `AGENTS.md`.

### CI

Detect the existing host before writing:

- GitHub remote or `.github/` → GitHub Actions.
- `.gitlab-ci.yml` or GitLab remote → GitLab include.
- `bitbucket-pipelines.yml` → staged Bitbucket custom pipeline.
- Multiple hosts → ask; do not silently pick.
- Neither → print options and skip.

Workflows must:

- run on schedule and manual dispatch;
- pin actions and OpenWiki;
- use least-privilege permissions;
- modify only approved documentation paths;
- open a PR/MR;
- never auto-merge;
- fail visibly.

### Initial audit

After initialization:

```sh
node ~/.documentation-toolkit/scripts/validate-config.mjs --root .
node ~/.documentation-toolkit/scripts/audit-project.mjs --root . --json
```

Report health and the next smallest action. Do not generate the whole wiki
during bootstrap unless the caller asks; initialization creates infrastructure,
not content.

## Part C — Troubleshooting

| Problem | Diagnosis | Fix |
| --- | --- | --- |
| OpenCode does not see skills | Check `~/.config/opencode/skills/<id>/SKILL.md`, `description`, and ID | Run `sync --host opencode`; reload OpenCode |
| OMP does not see skills | Check `~/.omp/agent/skills/<id>/SKILL.md`; name must match directory | Fix frontmatter or run `sync --host omp` |
| Command missing | Check host command directories and file extension | Run `sync`; verify |
| OpenWiki MCP missing | `openwiki integrations list`; inspect host MCP config | Re-run `openwiki integrations install <host>` |
| Wrong OMP profile | Check `OMP_PROFILE`, `PI_CODING_AGENT_DIR`, `~/.omp/profiles` | Pass `--omp-agent-dir` |
| Installer cannot write | Permissions or read-only filesystem | Fix permissions; do not use sudo blindly |
| Hash drift after manual edit | Installed file no longer matches manifest | Re-run `sync`; canonical edits belong in the toolkit |

## Part D — Safety

- Back up before modifying host configuration.
- Never overwrite unrelated settings.
- Never install a project framework globally.
- Never publish, commit, push, or deploy without authorization.
- Never use production data in screenshots.
- Keep the global toolkit free of project content.
- Record every managed file so uninstall is exact.

See `references/adapter-matrix.md` and `references/install-layout.md`.
