# Skills

DocsForge installs six portable Agent Skills.

| Skill | Responsibility |
| --- | --- |
| `docs-orchestrator` | Inspect the repo, assess health, route to the smallest operation |
| `codebase-documentation` | OpenWiki lifecycle and source-grounded engineering knowledge |
| `user-documentation` | Task guides, audiences, permissions, Help Center adapters |
| `documentation-screenshots` | Real captures with Playwright and synthetic data |
| `documentation-audit` | Independent evidence-based review |
| `documentation-bootstrap` | Global install/verify/upgrade and project bootstrap |

## Frontmatter

Every skill uses the portable `SKILL.md` format:

```yaml
---
name: docs-orchestrator
description: Main entrypoint for repository documentation. ...
license: MIT
compatibility: OpenCode, Oh My Pi, Agent Skills
---
```

OMP requires:

- `name` to match the directory name;
- lowercase kebab-case;
- no consecutive hyphens;
- a non-empty `description` of at most 1024 characters.

## `docs-orchestrator`

The main entrypoint. It:

1. confirms the Git root;
2. inspects existing documentation;
3. identifies the stack and product type;
4. detects the UI, docs framework, E2E tooling, and CI;
5. finds the OpenWiki workspace;
6. assesses engineering and customer documentation health;
7. recommends the minimum required work;
8. routes to one of four modes:
   - **INITIALIZE**
   - **SYNC**
   - **AUDIT**
   - **GENERATE**

It never initializes another project's documentation.

## `codebase-documentation`

Covers:

- architecture and modules;
- repository structure;
- frontend and backend design;
- database schema and relationships;
- APIs and contracts;
- authentication and authorization;
- permissions and multi-tenancy;
- business logic;
- external services and integrations;
- background jobs;
- caching and storage;
- AI systems and guardrails;
- error handling;
- testing;
- logging and monitoring;
- deployment and environment configuration;
- security;
- runbooks;
- ADRs.

It uses OpenWiki Claims and source evidence. It does not invent behavior.

## `user-documentation`

Investigates the actual product before writing:

- public and authenticated pages;
- user journeys;
- navigation;
- menus;
- forms;
- buttons;
- feature behavior;
- roles and permissions;
- access requirements;
- workflows;
- expected results;
- error states.

It writes for the product's actual audience and never exposes internal
architecture.

## `documentation-screenshots`

Captures real screenshots with Playwright:

- dedicated test user;
- synthetic demo data;
- stable locators;
- fixed viewport, locale, timezone, and theme;
- animations disabled;
- assertions before capture;
- inventory mapping;
- targeted regeneration.

It never uses AI-generated mockups or production customer data.

## `documentation-audit`

Compares documentation with:

- actual code;
- tests;
- runtime behavior;
- UI labels;
- permissions;
- screenshots.

It reports findings first, with evidence and severity. It does not rewrite
unless asked.

## `documentation-bootstrap`

Handles:

- global install;
- synchronization;
- status and verification;
- upgrades;
- backups;
- uninstall;
- project initialization;
- adapter selection;
- `AGENTS.md` policy merge;
- CI setup;
- troubleshooting.

## References

Each skill can include supporting files under `references/`. Skills are
installed with their references so an agent can load only what it needs.
