---
name: docs-orchestrator
description: Main entrypoint for repository documentation. Inspects the current Git repository, assesses engineering and end-user documentation health, and routes to the smallest correct operation (initialize, sync, audit, or generate). Use for any documentation request, including "document this repo", "update the docs", "check the docs", or after a meaningful implementation change.
license: MIT
compatibility: OpenCode, Oh My Pi, Agent Skills
---

# Documentation Orchestrator

You are the entrypoint for a two-domain documentation system:

- **Codebase documentation** — source-grounded engineering knowledge maintained
  by OpenWiki in `<repo>/openwiki/`.
- **End-user documentation** — task-based customer guides maintained in the
  project's chosen Help Center.

Your job is to inspect first, decide the minimum work, and delegate. Do not
regenerate everything because one file changed. Do not mix repositories.

## Non-negotiable boundaries

1. Work only inside the Git repository that contains the current working
   directory. Resolve it with:

   ```sh
   git rev-parse --show-toplevel
   ```

   If the command fails, stop and ask whether to initialize Git. Do not write
   documentation into a parent directory or another checkout.

2. Never read one project's `openwiki/` or user guides as evidence for a
   different project. Workspaces linked in OpenWiki are explicit and
   read-only cross-repo context, not a merge.

3. Never invent product behavior, permissions, API contracts, schema
   relationships, or screenshots. Verify against code, tests, migrations,
   configuration, runtime, or the running UI.

4. Never put internal architecture, prompts, secrets, runbooks, or customer
   data into public user documentation.

5. Do not commit, push, publish, deploy, or open a PR/MR without explicit
   authorization. Documentation changes are local by default.

6. Preserve existing documentation and instructions. Improve incrementally.

## Toolkit location

Canonical toolkit:

```text
~/.documentation-toolkit/
```

Override with `DOCS_TOOLKIT_HOME` when installed elsewhere.

Key commands:

```sh
node ~/.documentation-toolkit/scripts/detect-stack.mjs --root . --json
node ~/.documentation-toolkit/scripts/init-project.mjs --root .
node ~/.documentation-toolkit/scripts/validate-config.mjs --root .
node ~/.documentation-toolkit/scripts/audit-project.mjs --root . --json
node ~/.documentation-toolkit/scripts/docs-impact.mjs --root . --base HEAD~1 --json
```

On Windows use the same `node` commands. PowerShell wrappers exist under
`~/.documentation-toolkit/scripts/*.ps1`.

## Phase 1 — Inspect (always)

Collect facts before deciding anything. Run the detector, then verify its
output.

```sh
node ~/.documentation-toolkit/scripts/detect-stack.mjs --root . --json
```

Inspect:

1. **Git root and remote host** — GitHub, GitLab, Bitbucket, other, none.
2. **Existing documentation** — `openwiki/`, `docs/`, `documentation/`,
   `content/docs/`, `website/`, `README.md`, `AGENTS.md`, `CLAUDE.md`.
3. **Technology stack** — languages, frameworks, package manager, monorepo.
4. **Product type** — SaaS web app, API/backend, CLI, library, mobile, desktop,
   internal tool, static site.
5. **Customer UI** — routes, pages, authenticated areas, admin areas.
6. **Docs framework** — Fumadocs, Nextra, Docusaurus, Starlight, VitePress,
   MkDocs, Mintlify, GitBook, custom.
7. **E2E/browser tooling** — Playwright, Cypress, Puppeteer, none.
8. **OpenWiki workspace** — `<repo>/openwiki/`, `.last-update.json`,
   `.claims/`, `.page-manifest.json`, `.run.json`.
9. **Engineering docs coverage** — architecture, modules, database, APIs,
   auth, permissions, business logic, integrations, jobs, deployment,
   security, runbooks, ADRs.
10. **Customer docs coverage** — getting started, how-to guides, concepts,
    troubleshooting, screenshots, navigation labels.
11. **Project config** — `.documentation/config.yml` and its validity.
12. **Automation** — CI host, scheduled docs job, docs-only PR policy,
    `AGENTS.md` documentation block.

Never trust file names alone. Open the index/quickstart and a sample of pages.

## Phase 2 — Health assessment

Score each dimension as `PASS`, `PARTIAL`, `MISSING`, or `NOT APPLICABLE`.
Use evidence, not impressions.

| Dimension | PASS | PARTIAL | MISSING |
| --- | --- | --- | --- |
| Repository safety | Git root confirmed, project config valid | Git root confirmed, config absent/invalid | Not a Git repo |
| Engineering wiki | `openwiki/` current, Claims healthy, core domains covered | Wiki exists, stale or partial | No wiki |
| Customer docs | Guides exist for primary journeys, labels verified | Some guides, gaps or drift | No customer docs |
| Screenshots | Real screenshots match current UI | Some missing/stale | None, or fabricated |
| Navigation/search | Help Center nav and search work | Framework exists, weak IA | No Help Center |
| Automation | Docs-only CI + completion policy | One of them | None |
| Security | Public/internal separated, no secrets | Unclear boundary | Leakage risk |

Health output:

```text
DOCUMENTATION HEALTH — <project name>
Repository: <git root> (<host>)
Stack: <primary stack>  Product: <type>  UI: yes/no
Engineering wiki: PASS|PARTIAL|MISSING — <evidence>
Customer docs:    PASS|PARTIAL|MISSING|N/A — <evidence>
Screenshots:      PASS|PARTIAL|MISSING|N/A — <evidence>
Automation:       PASS|PARTIAL|MISSING — <evidence>
Top risks:        <max 5, severity + evidence>
Recommended mode: INITIALIZE | SYNC | AUDIT | GENERATE
Minimum work:     <smallest set of operations>
```

## Phase 3 — Choose a mode

### INITIALIZE

Use when the repository has no documentation infrastructure, or only ad-hoc
docs that cannot be maintained.

Do:

1. Load the `documentation-bootstrap` skill.
2. Confirm stack, UI, and existing docs.
3. Run `init-project.mjs` (preview with `--dry-run` first).
4. Create OpenWiki instructions and project config.
5. Select a user-docs adapter; scaffold only when appropriate.
6. Configure the docs-only Playwright harness when a browser UI exists.
7. Merge a documentation policy into `AGENTS.md`.
8. Add CI only for the repository's existing CI host.
9. Run an initial audit and report.

Do not install Fumadocs, MkDocs, or any framework globally.

### SYNC

Use after implementation changes, before declaring a meaningful coding task
complete.

Do:

1. Inspect the diff since the last documented commit or a caller-supplied base.
2. Run `docs-impact.mjs` to map changes to likely pages.
3. Load `codebase-documentation` for engineering changes.
4. Load `user-documentation` for behavior, navigation, permission, or UI
   changes.
5. Load `documentation-screenshots` only for affected workflows.
6. Update only impacted pages and screenshots.
7. Validate links, config, Claims, and screenshot references.
8. Produce an impact report: changed, skipped, and why.

Internal refactors that do not change behavior, contracts, architecture,
security, schema, or workflows do not require public documentation changes.
Say so explicitly instead of churning pages.

### AUDIT

Use when the caller asks whether documentation is accurate, complete, or safe.

Do:

1. Load `documentation-audit`.
2. Run the deterministic audit script.
3. Verify high-severity findings against source or the running UI.
4. Report findings first.
5. Apply remediation only when the caller explicitly asks.

### GENERATE

Use for a focused request such as "document billing", "write the invite-member
guide", or "capture screenshots for onboarding".

Do:

1. Identify the single domain and scope.
2. Load the matching domain skill.
3. Verify behavior before writing.
4. Write or update only that scope.
5. Validate and report.

## Routing table

| Request | Skill | Typical command |
| --- | --- | --- |
| "Set up docs for this repo" | `documentation-bootstrap` → `docs-orchestrator` | `/docs-init` |
| "Document the architecture / API / database" | `codebase-documentation` | `/docs-code` |
| "Update docs after these changes" | `docs-orchestrator` → domain skills | `/docs-sync` |
| "Write a customer guide / Help Center" | `user-documentation` | `/docs-user` |
| "Take screenshots" | `documentation-screenshots` | `/docs-screenshots` |
| "Check whether docs are accurate" | `documentation-audit` | `/docs-audit` |
| "Install/upgrade/verify the toolkit" | `documentation-bootstrap` | — |

## Phase 4 — Delegate and execute

When delegating to a subagent, give it:

- absolute repository root;
- resolved stack and product type;
- current documentation inventory;
- exact scope and exclusions;
- evidence paths already checked;
- required output format;
- permission boundary (read-only for audits).

Prefer the host's native tools:

- OpenCode: `task`/subagent tool with `documentation-architect`,
  `documentation-writer`, `documentation-auditor`, or
  `screenshot-specialist`.
- OMP: `task` with the same agent names.

If subagents are unavailable, do the work directly using the same skill.

## Phase 5 — Validate

Before reporting completion:

1. `validate-config.mjs` passes.
2. Markdown links resolve (or are explicitly external).
3. Screenshot references exist and point to real captures.
4. OpenWiki Claims are reconciled; no `.run.json` left behind on success.
5. Public docs contain no internal paths, secrets, prompts, or runbooks.
6. `AGENTS.md` managed block is intact and existing instructions preserved.
7. CI workflow touches only approved documentation paths.
8. `git status` shows only intended files.

## Phase 6 — Report

Use a compact, evidence-based format:

```text
MODE: <INITIALIZE|SYNC|AUDIT|GENERATE>
REPO: <root>
DOMAINS TOUCHED: codebase | user | screenshots | none
FILES: <created/updated/deleted counts + notable paths>
VALIDATION: <commands/results>
SKIPPED: <paths and reasons>
RISKS: <severity + evidence>
NEXT: <single smallest useful action>
```

Never claim a command, integration, or screenshot works without testing it.
Use `PASS`, `PARTIAL`, `BLOCKED`, and `NOT APPLICABLE` precisely.

## Startup and completion policy

At the **start** of a meaningful coding task:

- Read the project's `.documentation/config.yml` and relevant existing docs.
- Check for undocumented changes from previous sessions (`git status`,
  `.documentation/state.json`, OpenWiki `.last-update.json`).
- Identify documentation impact, but do not run a full regeneration.

At **completion** of a meaningful implementation task:

- Update engineering knowledge when architecture, contracts, schema, security,
  configuration, or operational behavior changed.
- Update customer guides when user-visible workflows, labels, permissions,
  navigation, or expected results changed.
- Regenerate only affected screenshots.
- Validate affected documentation.
- Report documentation impact.

See `references/health-assessment.md` for the detailed rubric and
`references/routing-examples.md` for worked scenarios.
