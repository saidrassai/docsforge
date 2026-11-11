# Verification record

**Toolkit version:** 1.0.0
**Repository:** <https://github.com/saidrassai/docsforge>
**Verified:** 2026-11-11
**Host:** Ubuntu 26.04.1 LTS (Linux x86_64), Node.js 24.22.2
**CI:** PASS on Ubuntu and Windows, Node 22 and 24

## Global installation

| Check | Result | Evidence |
| --- | --- | --- |
| Canonical toolkit at `~/.documentation-toolkit` | PASS | `VERSION` = 1.0.0; required directories present |
| OpenCode 2.1.4 detected | PASS | `opencode --version` |
| Oh My Pi 18.15.0 detected | PASS | `omp --version` |
| Node.js ≥ 22.22.0 | PASS | 24.22.2 |
| npm / pnpm availability | PASS | npm 11.19.1, pnpm 10.28.1 |
| Existing configuration backed up | PASS | `backups/20261111-142008`, `CONFIG-LATEST.txt` |
| OpenWiki 0.9.0 installed globally with npm | PASS | `openwiki integrations list`; `better-sqlite3` loads |
| OpenCode integration | PASS | `openwiki integrations install opencode`; MCP entry present |
| OMP integration | PASS | `openwiki integrations install omp`; MCP entry present |
| Skills synchronized to OpenCode | PASS | 6 skills in `~/.config/opencode/skills` |
| Skills synchronized to OMP | PASS | 6 skills in `~/.omp/agent/skills` |
| Agents synchronized | PASS | 4 agents in each host |
| Commands synchronized | PASS | 6 commands in each host |
| Uninstall manifest and hashes | PASS | `state/install-manifest.json`, 29 files/host |
| Directory drift after sync | PASS | `status`: 29 ok / 0 missing / 0 drift per host |

## Live host discovery

`node scripts/verify-hosts.mjs` → **PASS**

- OpenCode reports all six skills, six `docs-*` commands, and four agents.
- OMP's RPC command catalog reports all six `skill:*` entries and all six
  `docs-*` file commands with argument hints.
- OpenWiki MCP entry present in both host configurations.
- OpenWiki integration list reports both hosts installed.

Additional evidence:

- OpenCode `GET /api/command` lists `docs-init`, `docs-sync`, `docs-audit`,
  `docs-code`, `docs-user`, `docs-screenshots`.
- OpenCode `GET /api/skill` lists all six toolkit skills.
- `opencode debug agents` lists the four toolkit agents.
- `omp read skill://<id>` loads each toolkit skill's `SKILL.md`.
- `openwiki mcp --host omp` responds to an MCP `initialize` request with
  `serverInfo.name = openwiki`, version 0.9.0.

## OpenWiki MCP lifecycle

| Check | Result | Evidence |
| --- | --- | --- |
| `openwiki_begin` in a test repository | PASS | Returned `status=active`, `phase=planning`, run ID |
| Repository scoping | PASS | Root was the test repository; no cross-repo content used |
| Run-state cleanup after test | PASS | `.run.json` removed from the throwaway repository |

Full page generation was **not** run because it requires a configured model
provider and would write a real wiki. The lifecycle start and MCP transport were
verified.

## Self-test

`node scripts/self-test.mjs` → **9/9 PASS**

- Toolkit files present
- Skill frontmatter valid
- JSON manifests parse
- Stack detection (Next.js + Prisma + Playwright)
- Project initialization
- Config validation
- Deterministic audit
- Documentation impact mapping
- No writes outside the target repository

## Project initialization matrix

| Fixture | Detected | Result |
| --- | --- | --- |
| Next.js SaaS + Prisma + Playwright | SaaS, UI, Fumadocs, Playwright | PASS |
| Next.js + Fumadocs | Web app, UI, `content/docs` | PASS |
| React/Vite + GitHub workflows | Web app, UI, Docusaurus, GitHub CI | PASS |
| Python FastAPI + SQLAlchemy | API, MkDocs, no screenshots | PASS |
| Python + existing `mkdocs.yml` | Docs site, preserve MkDocs | PASS |
| Node CLI library | CLI, no UI, no screenshots, no Help Center | PASS |
| GitLab repository | GitLab include appended safely | PASS |
| Bitbucket repository | Staged Bitbucket custom pipeline | PASS |
| No CI host | No CI files; guidance only | PASS |

All initialized fixtures passed `validate-config.mjs` and
`audit-project.mjs` without crashing.

## Safety checks

| Check | Result |
| --- | --- |
| Existing `AGENTS.md` content preserved | PASS — custom text retained outside managed block |
| Existing unmanaged agent conflict | PASS — skipped without `--force`, backed up with `--force` |
| Uninstall restores pre-existing file | PASS — isolated fake-home test |
| Uninstall removes only managed files | PASS — isolated fake-home test |
| Backup restore scoped to host root | PASS — added and tested root-scoped backup metadata |
| Config path traversal rejected | PASS — `../outside` rejected by validator |
| Dangerous security flags warned | PASS |
| Public docs referencing `openwiki/` detected | PASS — CRITICAL finding |
| Screenshot reference missing detected | PASS — HIGH finding |
| Stale screenshot date detected | PASS — MEDIUM finding |
| Playwright screenshot capture | PASS — generated docs-only config captured a real 1440×900 PNG from a local server |
| Secrets/native dependency review documented | PASS — `docs-toolkit licenses` |

## Partial or not exercised

| Item | Status | Reason |
| --- | --- | --- |
| Windows PowerShell wrappers executed | PARTIAL | No Windows host or PowerShell available in this environment; scripts are static-checked and use cross-platform Node APIs |
| Full OpenWiki generation with a model provider | BLOCKED | Provider credentials and model calls were intentionally not used |
| End-to-end slash-command invocation through a model | PARTIAL | Command discovery and templates verified; actual model-driven execution not run to avoid unintended edits/cost |
| OMP task-agent dispatch | PARTIAL | Agent files installed and formatted; OMP live catalog has no agent-list API and dispatch requires a model call |
| Real application screenshot capture | NOT APPLICABLE | No target application repository was provided; the generated harness captured a real PNG from a controlled local server |
| Publishing/deploying documentation | NOT APPLICABLE | Explicitly out of scope without authorization |
