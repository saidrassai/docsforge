# Verification

DocsForge is verified at two levels: repository CI and live host discovery.

## Repository CI

The GitHub Actions workflow runs:

| Job | Matrix |
| --- | --- |
| Script syntax | Ubuntu + Windows, Node 22 + 24 |
| Isolated self-test | Ubuntu + Windows, Node 22 + 24 |
| Documentation checks | Ubuntu, Node 22 |

The documentation job checks:

- canonical skill frontmatter;
- JSON manifests;
- README links to existing files.

Run the same checks locally:

```sh
node scripts/check-syntax.mjs
node scripts/self-test.mjs
```

## Live host verification

Run:

```sh
node ~/.documentation-toolkit/scripts/verify-hosts.mjs
```

It asks each host for its live catalog and confirms:

- six skills;
- six `docs-*` commands;
- four agents in OpenCode;
- OpenWiki MCP entries in both hosts;
- OpenWiki integrations installed.

Expected shape:

```text
OpenCode: PASS
  skills:   codebase-documentation, docs-orchestrator, documentation-audit,
            documentation-bootstrap, documentation-screenshots,
            user-documentation
  commands: docs-audit, docs-code, docs-init, docs-screenshots, docs-sync,
            docs-user
  agents:   documentation-architect, documentation-auditor,
            documentation-writer, screenshot-specialist

Oh My Pi: PASS
  skills:   ...
  commands: ...

OpenWiki MCP: PASS
  OpenCode config: present
  OMP config: present
  Integrations: opencode=true, omp=true
```

## Self-test coverage

`self-test.mjs` checks:

1. required toolkit files exist;
2. skill frontmatter is valid;
3. JSON manifests parse;
4. stack detection works;
5. project initialization creates the expected files;
6. config validation passes;
7. the audit produces structured findings;
8. a UI change maps to the impact helper;
9. nothing is written outside the target repository.

## Verified environment

The initial release was verified on:

| Component | Version |
| --- | --- |
| Ubuntu | 26.04.1 LTS |
| Node.js | 24.22.2 |
| OpenCode | 2.1.4 |
| Oh My Pi | 18.15.0 |
| OpenWiki | 0.9.0 |
| Playwright | 1.65 |

## Docs site

The project documentation is built with MkDocs Material and deployed to GitHub
Pages:

<https://saidrassai.github.io/docsforge/>

`mkdocs build --strict` passes, and the deployed site responds with HTTP 200.

## Playwright verification

The generated docs-only config captured a real 1440×900 PNG from a controlled
local application. The config’s project-level viewport override was verified
after spreading a Playwright device preset.

## What was not exercised

| Item | Status | Reason |
| --- | --- | --- |
| Full OpenWiki generation | BLOCKED | Requires a configured model provider; lifecycle start and MCP transport were verified |
| Model-driven slash-command execution | PARTIAL | Commands installed and discoverable; execution was not run to avoid unintended edits/cost |
| OMP task-agent dispatch | PARTIAL | Agent files validated; OMP has no live agent-list API |
| Real customer application screenshots | NOT APPLICABLE | No target app was provided; the harness was verified with a controlled local app |

The full record is in the repository:

<https://github.com/saidrassai/docsforge/blob/main/VERIFICATION.md>
