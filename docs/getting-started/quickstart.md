# Quick start

This page walks through documentation from zero to a maintained setup in one
repository.

## 1. Inspect the repository

```sh
cd ~/projects/acme-saas
git rev-parse --show-toplevel

node ~/.documentation-toolkit/scripts/detect-stack.mjs --root . --json
```

The detector reports:

- Git root and remote host;
- languages, frameworks, package manager, monorepo signals;
- product type and whether a customer UI exists;
- existing docs framework and E2E tooling;
- existing OpenWiki state and project config;
- recommended codebase docs, user docs, screenshots, and CI provider.

## 2. Initialize

Preview first:

```sh
node ~/.documentation-toolkit/scripts/init-project.mjs --root . --dry-run
```

Apply:

```sh
node ~/.documentation-toolkit/scripts/init-project.mjs --root .
```

Or use the agent command:

```text
/docs-init
```

The initializer creates only infrastructure:

```text
.documentation/config.yml
.documentation/state.json
.documentation/README.md
.documentation/user-docs.md
.documentation/templates/user-guide.md
.documentation/audit/
.documentation/screenshots/
.documentation/toolkit/
openwiki/INSTRUCTIONS.md
.openwikiignore
<user-docs content directory>/
docs/assets/screenshots/
playwright.docs.config.ts          # only when a browser UI exists
AGENTS.md                          # managed block merged
.github/workflows/docs-*.yml       # only for GitHub
```

It does **not** invent architecture, guides, or screenshots.

Existing `AGENTS.md` instructions are preserved. Only the managed
`<!-- DOCUMENTATION:START -->` block is replaced.

## 3. Document the codebase

```text
/docs-code
```

This uses OpenWiki's authenticated host lifecycle. The agent:

1. resolves the Git root;
2. calls `openwiki_begin`;
3. plans repository-specific pages;
4. researches each page with native tools;
5. writes the page and sparse Claims;
6. calls `openwiki_finish`.

The output lives in `openwiki/`, with Claims under `openwiki/.claims/`.

For a focused area:

```text
/docs-code billing permissions
```

## 4. Write customer guides

```text
/docs-user "invite a member"
```

The writer verifies:

- the route;
- exact navigation labels;
- required permissions;
- form fields and formats;
- expected result;
- error states;
- related guides.

It never copies internal architecture into the public Help Center.

## 5. Capture real screenshots

```text
/docs-screenshots "invite member"
```

The screenshot specialist:

- uses a dedicated test user;
- seeds synthetic demo data;
- asserts the UI state before capture;
- writes to `docs/assets/screenshots/`;
- updates `.documentation/screenshots/inventory.yml`;
- references the images from the guide.

## 6. Audit

```text
/docs-audit
```

Or focus one domain:

```text
/docs-audit engineering
/docs-audit customer
/docs-audit screenshots
```

The auditor runs deterministic checks, verifies high-severity findings against
source or the running UI, and reports findings first. It does not rewrite unless
you ask for remediation.

## 7. Sync after changes

After a meaningful implementation change:

```text
/docs-sync
```

With an explicit base:

```text
/docs-sync origin/main
```

The impact helper reports changed files, routes, wiki pages, guides, and
screenshots. Only affected documentation is updated.

Internal refactors with no behavior, contract, schema, security, or workflow
change produce **no public documentation changes**.

## 8. Automate

`/docs-init` adds a scheduled workflow only for the repository's existing CI
host:

| Host | Output |
| --- | --- |
| GitHub | `.github/workflows/docs-check.yml`, `docs-sync.yml` |
| GitLab | `.documentation/ci/openwiki-update.gitlab-ci.yml` + include |
| Bitbucket | Staged custom pipeline |
| None | Guidance only |

Scheduled sync:

- runs daily and on manual dispatch;
- changes only documentation paths;
- opens a docs-only PR/MR;
- never auto-merges;
- fails visibly.

See [CI automation](../guides/automation.md).

## Example project config

```yaml
version: 1

project:
  name: acme-saas
  type: saas

codebase:
  enabled: true
  engine: openwiki
  output: openwiki/

user_docs:
  enabled: true
  framework: fumadocs
  content_directory: content/docs

screenshots:
  enabled: true
  engine: playwright
  source: application
  demo_data: synthetic

automation:
  agent_completion_sync: true
  daily_ci_sync: true
  automatic_merge: false
  ci_provider: github

security:
  internal_docs_public: false
  production_data_in_screenshots: false
  secrets_in_docs: false
```

Validate:

```sh
node ~/.documentation-toolkit/scripts/validate-config.mjs --root . --json
```
